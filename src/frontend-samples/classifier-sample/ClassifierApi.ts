/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/

import { ContextRealityModel, ContextRealityModelProps, ModelProps, ModelQueryParams, SpatialClassifier } from "@bentley/imodeljs-common";
import { IModelConnection, queryRealityData, ScreenViewport, SpatialModelState, SpatialViewState, Viewport } from "@bentley/imodeljs-frontend";
import { Presentation, SelectionChangesListener } from "@bentley/presentation-frontend";

export default class ClassifierApi {
  private static _selectionListener: SelectionChangesListener;

  public static removeSelectionListener() {
    Presentation.selection.selectionChange.removeListener(this._selectionListener);
  }

  public static addSelectionListener(listener: SelectionChangesListener) {
    this._selectionListener = listener;
    Presentation.selection.selectionChange.addListener(this._selectionListener);
  }

  public static async turnOnAvailableRealityModel(viewPort: ScreenViewport, imodel: IModelConnection) {
    const style = viewPort.displayStyle.clone();

    // Get first available reality models and attach them to displayStyle
    const availableModels: ContextRealityModelProps[] = await queryRealityData({ contextId: imodel.contextId!, filterIModel: imodel });
    for (const crmProp of availableModels) {
      crmProp.classifiers = [];
      style.attachRealityModel(crmProp);
      viewPort.displayStyle = style;
      break;
    }
  }

  /**
   * Query the iModel to get available spatial classifiers.
   * Also do a custom sort and filtering for the purposes of this sample.
   */
  public static async getAvailableClassifierListForViewport(vp?: Viewport): Promise<{ [key: string]: string }> {
    const models: { [key: string]: string } = {};
    if (!vp || !(vp.view instanceof SpatialViewState))
      return Promise.resolve(models);

    const modelQueryParams: ModelQueryParams = {
      from: SpatialModelState.classFullName,
      wantPrivate: false,
    };

    let curModelProps: ModelProps[] = new Array<ModelProps>();
    curModelProps = await vp.iModel.models.queryProps(modelQueryParams);

    // Custom sort to put 'Commercial' first. It makes the best default example.
    curModelProps = curModelProps.sort((a, b) => {
      if (b.name?.includes("Commercial"))
        return 1;
      if (a.name?.includes("Commercial"))
        return -1;
      return a.name!.localeCompare(b.name!);
    });

    // Filter out models that are not classifiers and form {[key: string]: string } object
    for (const modelProps of curModelProps) {
      if (modelProps.id && modelProps.name !== "PhiladelphiaClassification" && modelProps.name !== "Philadelphia_Pictometry") {
        const modelId = modelProps.id;
        const name = modelProps.name ? modelProps.name : modelId;
        models[modelId] = name.substring(0, name.indexOf(","));
      }
    }

    return Promise.resolve(models);
  }

  // Update the classifier in the ViewPort
  public static updateRealityDataClassifiers(vp: ScreenViewport, classifier: SpatialClassifier) {
    // Get the first reality model in the view
    const realityModel: ContextRealityModel = vp.displayStyle.settings.contextRealityModels.models[0];

    // Loop through all classifiers in the reality model.
    // If the classifier exists (check by name), replace it with classifier argument
    // If the classifier is not found, add it to realityModel.classifiers
    if (realityModel && realityModel.classifiers) {
      let existingClassifier: SpatialClassifier | undefined;
      for (const c of realityModel.classifiers) {
        if (c.name === classifier.name) {
          existingClassifier = c;
        }
      }

      if (!existingClassifier)
        realityModel.classifiers.add(classifier);
      else
        realityModel.classifiers.replace(existingClassifier, classifier);

      realityModel.classifiers.setActive(classifier);
      vp.invalidateScene();

      return;
    }
  }
}

/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
import { AccuDrawHintBuilder, ContextRotationId, IModelApp, IModelConnection, ScreenViewport, StandardViewId, ViewClipClearTool, ViewClipDecorationProvider, ViewClipTool, Viewport, ViewState } from "@bentley/imodeljs-frontend";
import { ClipMaskXYZRangePlanes, ClipPlane, ClipPrimitive, ClipShape, ClipVector, ConvexClipPlaneSet, Plane3dByOriginAndUnitNormal, Point3d, Vector3d } from "@bentley/geometry-core";
import { ViewSetup } from "@itwinjs-sandbox";

export default class ViewClipApi {

  /* Method for clearing all clips in the viewport */
  public static clearClips(vp: ScreenViewport) {
    // Run the ViewClipClearTool and hide the decorators
    IModelApp.tools.run(ViewClipClearTool.toolId);
    ViewClipDecorationProvider.create().toggleDecoration(vp);
  }

  /* Method for adding decorators to the viewport */
  public static addDecorators(vp: ScreenViewport) {
    // Create a clip decorator. Selecting the clip decoration to immediately show the handles is the default.
    const vcdp: ViewClipDecorationProvider = ViewClipDecorationProvider.create();
    // Default behavior is to hide the decorators on deselect. We want to keep the decorators showing in this example.
    vcdp.clearDecorationOnDeselect = false;
    vcdp.showDecoration(vp);
    // The decorators require the SelectTool being active.
    IModelApp.toolAdmin.startDefaultTool();
  }

  /* Method for adding a new clip range around the model's extents */
  public static addExtentsClipRange = (vp: ScreenViewport) => {
    // Get the range of the model contents.
    const range = vp.view.computeFitRange();
    // Remove the top half of the z-range so we have something clipped by default
    range.high.z = (range.high.z + range.low.z) / 2.0;
    // Create a block for the ClipVector.
    const block: ClipShape = ClipShape.createBlock(range, range.isAlmostZeroZ ? ClipMaskXYZRangePlanes.XAndY : ClipMaskXYZRangePlanes.All, false, false);
    // Create the ClipVector
    const clip: ClipVector = ClipVector.createEmpty();
    // Add the block to the Clipvector and set it in the ScreenViewport.
    clip.appendReference(block);
    // Call enableClipVolume to ensure all clip flags are properly set
    ViewClipTool.enableClipVolume(vp);
    vp.view.setViewClip(clip);
    ViewClipApi.addDecorators(vp);
  };

  /* Method for getting a normal vector. */
  public static getPlaneInwardNormal(orientation: ContextRotationId, viewport: Viewport): Vector3d | undefined {
    const matrix = AccuDrawHintBuilder.getContextRotation(orientation, viewport);
    if (undefined === matrix)
      return undefined;
    return matrix.getColumn(2).negate();
  }

  public static setViewClipFromClipPlaneSet(vp: ScreenViewport, planeSet: ConvexClipPlaneSet) {
    const prim = ClipPrimitive.createCapture(planeSet);
    const clip = ClipVector.createEmpty();
    clip.appendReference(prim);
    vp.view.setViewClip(clip);
    vp.setupFromView();
    this.addDecorators(vp);
    return true;
  }

  /* Method for setting a plane as the view clip */
  public static setClipPlane(vp: ScreenViewport, clipPlane: string, imodel: IModelConnection) {
    let rotationType: ContextRotationId;
    switch (clipPlane) {
      default:
      case "0": rotationType = ContextRotationId.Top; break;
      case "1": rotationType = ContextRotationId.Front; break;
      case "2": rotationType = ContextRotationId.Left; break;
      case "None": return true;
    }

    // Get the center point of the displayed extents as a starting point for the clip plane
    const point: Point3d = imodel.displayedExtents.center;
    const normal: Vector3d | undefined = this.getPlaneInwardNormal(rotationType, vp);
    const plane: Plane3dByOriginAndUnitNormal | undefined = Plane3dByOriginAndUnitNormal.create(point, normal!);
    if (undefined === plane)
      return false;
    let planeSet: ConvexClipPlaneSet | undefined;

    if (undefined === planeSet)
      planeSet = ConvexClipPlaneSet.createEmpty();
    planeSet.addPlaneToConvexSet(ClipPlane.createPlane(plane));
    return this.setViewClipFromClipPlaneSet(vp, planeSet);
  }

  /* Get the inital view for the widget*/
  public static getIsoView = async (imodel: IModelConnection): Promise<ViewState> => {
    const viewState = await ViewSetup.getDefaultView(imodel);

    if (viewState.is3d()) {
      const displayStyle = viewState.getDisplayStyle3d();
      displayStyle.changeBackgroundMapProps({ transparency: 1.0 });

      // Rotate the view to make the view clip look better.
      viewState.setStandardRotation(StandardViewId.RightIso);

      const range = viewState.computeFitRange();
      const aspect = ViewSetup.getAspectRatio();

      viewState.lookAtVolume(range, aspect);
    }

    return viewState;
  };

}

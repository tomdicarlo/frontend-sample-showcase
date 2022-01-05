/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
import React, { FunctionComponent, useState } from "react";
import { AuthorizationClient, default2DSandboxUi, SampleIModels, useSampleWidget, ViewSetup } from "@itwinjs-sandbox";
import { Viewer } from "@itwin/web-viewer-react";
import { IModelConnection } from "@itwin/core-frontend";
import { IModelViewportControlOptions } from "@itwin/appui-react";
import { ReadSettingsWidgetProvider } from "./ReadSettingsWidget";

const uiProviders = [new ReadSettingsWidgetProvider()];

const ReadSettingsApp: FunctionComponent = () => {
  const sampleIModelInfo = useSampleWidget("Choose a Setting Name below to read that setting from the ProductSettingsService", [SampleIModels.BayTown]);

  const _initialViewstate = async (iModelConnection: IModelConnection) => {
    return await ViewSetup.getDefaultView(iModelConnection);
  };

  return (
    <>
      { /* Viewport to display the iModel */}
      {sampleIModelInfo?.contextId && sampleIModelInfo?.iModelId &&
        <Viewer
          productId="2686"
          iTwinId={sampleIModelInfo.contextId}
          iModelId={sampleIModelInfo.iModelId}
          authConfig={{ getAccessToken: AuthorizationClient.oidcClient.getAccessToken, onAccessTokenChanged: AuthorizationClient.oidcClient.onAccessTokenChanged }}
          viewportOptions={{ viewState: _initialViewstate }}
          defaultUiConfig={default2DSandboxUi}
          uiProviders={uiProviders}
          theme="dark"
        />
      }
    </>
  );
};

export default ReadSettingsApp;


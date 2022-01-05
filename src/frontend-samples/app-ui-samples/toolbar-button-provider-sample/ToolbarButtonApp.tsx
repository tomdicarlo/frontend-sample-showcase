/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
import React, { FunctionComponent, useState } from "react";
import { ToolbarButtonProvider } from "./ToolbarButtonProvider";
import { AuthorizationClient, default3DAppUi, useSampleWidget, ViewSetup } from "@itwinjs-sandbox";
import { IModelConnection } from "@itwin/core-frontend";
import { Viewer } from "@itwin/web-viewer-react";
import { IModelViewportControlOptions } from "@itwin/appui-react";

const uiProviders = [new ToolbarButtonProvider()];

const ToolbarButtonApp: FunctionComponent = () => {
  const sampleIModelInfo = useSampleWidget("Press the Lightbulb button tool at the top of the screen.");

  const _initialViewstate = async (iModelConnection: IModelConnection) => {
    return await ViewSetup.getDefaultView(iModelConnection);
  };


  return (
    <>
      { /* Viewport to display the iModel */}
      {sampleIModelInfo?.iModelName && sampleIModelInfo?.contextId && sampleIModelInfo?.iModelId &&
        <Viewer
          iTwinId={sampleIModelInfo.contextId}
          iModelId={sampleIModelInfo.iModelId}
          authConfig={{ getAccessToken: AuthorizationClient.oidcClient.getAccessToken, onAccessTokenChanged: AuthorizationClient.oidcClient.onAccessTokenChanged }}
          viewportOptions={{ viewState: _initialViewstate }}
          defaultUiConfig={default3DAppUi}
          theme="dark"
          uiProviders={uiProviders}
        />
      }
    </>
  );
};

export default ToolbarButtonApp;

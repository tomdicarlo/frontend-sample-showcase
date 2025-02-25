/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
import { Angle, AuxChannel, AuxChannelData, AuxChannelDataType, IModelJson, Point3d, Polyface, PolyfaceAuxData, PolyfaceBuilder, StrokeOptions, Transform } from "@bentley/geometry-core";
import { AnalysisStyle, AnalysisStyleProps, ThematicGradientSettingsProps } from "@bentley/imodeljs-common";
import { Animator, Viewport } from "@bentley/imodeljs-frontend";
import { ScientificVizDecorator } from "./ScientificVizDecorator";
import { jsonData } from "./Cantilever";

export default class ScientificVizApi {

  /** Reads the cantilever data from the supplied json file.  The json data includes the
   * definition of the mesh including aux data defining displacement and stress.
   */
  public static async createCantilever(): Promise<Polyface> {
    const polyface = IModelJson.Reader.parse(JSON.parse(jsonData)) as Polyface;
    const transform = Transform.createScaleAboutPoint(new Point3d(), 30);
    polyface.tryTransformInPlace(transform);
    return polyface;
  }

  public static createAnalysisStyleForChannels(thematicChannel?: AuxChannel, thematicSettings?: ThematicGradientSettingsProps, displacementChannel?: AuxChannel, displacementScale?: number) {
    const props: AnalysisStyleProps = {};

    if (thematicChannel && thematicChannel.name && thematicChannel.scalarRange) {
      props.scalar = {
        channelName: thematicChannel.name,
        range: thematicChannel.scalarRange,
        thematicSettings,
      };
    }

    if (displacementChannel && displacementChannel.name)
      props.displacement = {
        channelName: displacementChannel.name,
        scale: displacementScale,
      };

    return AnalysisStyle.fromJSON(props);
  }

  /** This method constructs the mesh called "flat mesh with waves".  It is a non-realistic example intended to illustrate how
   * to use the API to create auxdata.  The mesh facets are a grid of quads representing a square.
   *
   * There are a total of nine channels of auxdata created in three sets:
   *    Radial: Static: including three channels: Displacement (vector), Height (scalar), and slope (scalar)
   *    Radial: Time:   including three channels: Displacement (vector), Height (scalar), and slope (scalar)
   *    Linear: Time:   including three channels: Displacement (vector), Height (scalar), and slope (scalar)
   *
   * The "Radial: Static" channels each include only a single set of data, so these cannot be animated.
   * The "Radial: Time" channels each include three sets of data.  The first and last contain all zero values.
   * The "Linear: Time" channels each include ten sets of data to represent the waves rolling the length of the square mesh.
  * */
  public static createFlatMeshWithWaves(): Polyface {
    const options = StrokeOptions.createForFacets();
    options.shouldTriangulate = true;
    const builder = PolyfaceBuilder.create(options);
    const nDimensions = 100;
    const spacing = 1.0;

    /* Create a simple flat mesh with 10,000 points (100x100) */
    for (let iRow = 0; iRow < nDimensions - 1; iRow++) {
      for (let iColumn = 0; iColumn < nDimensions - 1; iColumn++) {
        const quad = [
          Point3d.create(iRow * spacing, iColumn * spacing, 0.0),
          Point3d.create((iRow + 1) * spacing, iColumn * spacing, 0.0),
          Point3d.create((iRow + 1) * spacing, (iColumn + 1) * spacing, 0.0),
          Point3d.create(iRow * spacing, (iColumn + 1) * spacing),
        ];
        builder.addQuadFacet(quad);
      }
    }

    const polyface = builder.claimPolyface();
    const zeroScalarData = [], zeroDisplacementData = [], radialHeightData = [], radialSlopeData = [], radialDisplacementData = [];
    const radius = nDimensions * spacing / 2.0;
    const center = new Point3d(radius, radius, 0.0);
    const maxHeight = radius / 4.0;
    const auxChannels = [];

    /** Create a radial wave - start and return to zero  */
    for (let i = 0; i < polyface.data.point.length; i++) {
      const angle = Angle.pi2Radians * polyface.data.point.distanceIndexToPoint(i, center)! / radius;
      const height = maxHeight * Math.sin(angle);
      const slope = Math.abs(Math.cos(angle));

      zeroScalarData.push(0.0);
      zeroDisplacementData.push(0.0);
      zeroDisplacementData.push(0.0);
      zeroDisplacementData.push(0.0);

      radialHeightData.push(height);
      radialSlopeData.push(slope);
      radialDisplacementData.push(0.0);
      radialDisplacementData.push(0.0);
      radialDisplacementData.push(height);
    }

    // Static Channels.
    auxChannels.push(new AuxChannel([new AuxChannelData(0.0, radialDisplacementData)], AuxChannelDataType.Vector, "Static Radial Displacement", "Radial: Static"));
    auxChannels.push(new AuxChannel([new AuxChannelData(1.0, radialHeightData)], AuxChannelDataType.Distance, "Static Radial Height", "Radial: Static"));
    auxChannels.push(new AuxChannel([new AuxChannelData(1.0, radialSlopeData)], AuxChannelDataType.Scalar, "Static Radial Slope", "Radial: Static"));

    // Animated Channels.
    const radialDisplacementDataVector = [new AuxChannelData(0.0, zeroDisplacementData), new AuxChannelData(1.0, radialDisplacementData), new AuxChannelData(2.0, zeroDisplacementData)];
    const radialHeightDataVector = [new AuxChannelData(0.0, zeroScalarData), new AuxChannelData(1.0, radialHeightData), new AuxChannelData(2.0, zeroScalarData)];
    const radialSlopeDataVector = [new AuxChannelData(0.0, zeroScalarData), new AuxChannelData(1.0, radialSlopeData), new AuxChannelData(2.0, zeroScalarData)];

    auxChannels.push(new AuxChannel(radialDisplacementDataVector, AuxChannelDataType.Vector, "Animated Radial Displacement", "Radial: Time"));
    auxChannels.push(new AuxChannel(radialHeightDataVector, AuxChannelDataType.Distance, "Animated Radial Height", "Radial: Time"));
    auxChannels.push(new AuxChannel(radialSlopeDataVector, AuxChannelDataType.Scalar, "Animated Radial Slope", "Radial: Time"));

    /** Create linear waves -- 10 separate frames.  */
    const waveHeight = radius / 20.0;
    const waveLength = radius / 2.0;
    const frameCount = 10;
    const linearDisplacementDataVector = [], linearHeightDataVector = [], linearSlopeDataVector = [];

    for (let i = 0; i < frameCount; i++) {
      const fraction = i / (frameCount - 1);
      const waveCenter = waveLength * fraction;
      const linearHeightData = [], linearSlopeData = [], linearDisplacementData = [];

      for (let j = 0; j < polyface.data.point.length; j++) {
        const point = polyface.data.point.getPoint3dAtUncheckedPointIndex(j);
        const theta = Angle.pi2Radians * (point.x - waveCenter) / waveLength;
        const height = waveHeight * Math.sin(theta);
        const slope = Math.abs(Math.cos(theta));

        linearHeightData.push(height);
        linearSlopeData.push(slope);
        linearDisplacementData.push(0.0);
        linearDisplacementData.push(0.0);
        linearDisplacementData.push(height);
      }
      linearDisplacementDataVector.push(new AuxChannelData(i, linearDisplacementData));
      linearHeightDataVector.push(new AuxChannelData(i, linearHeightData));
      linearSlopeDataVector.push(new AuxChannelData(i, linearSlopeData));
    }
    auxChannels.push(new AuxChannel(linearDisplacementDataVector, AuxChannelDataType.Vector, "Linear Displacement", "Linear: Time"));
    auxChannels.push(new AuxChannel(linearHeightDataVector, AuxChannelDataType.Distance, "Linear Height", "Linear: Time"));
    auxChannels.push(new AuxChannel(linearSlopeDataVector, AuxChannelDataType.Scalar, "Linear Slope", "Linear: Time"));

    polyface.data.auxData = new PolyfaceAuxData(auxChannels, polyface.data.pointIndex);
    return polyface;
  }

  /** The viewport's analysis style controls which channels from the auxdata are used to display the mesh. */
  public static setAnalysisStyle(vp: Viewport, style?: AnalysisStyle) {
    vp.displayStyle.settings.analysisStyle = style;
  }

  /** This method shows how to determine if an analysis style can be animated. */
  public static styleSupportsAnimation(style: AnalysisStyle) {
    // The channels array holds all the channels available on the polyface.
    const channels = ScientificVizDecorator.decorator.polyface.data.auxData?.channels;
    if (!channels)
      return false;

    // The analysis style specifies up to three channelNames.
    const channelNames = [style.displacement?.channelName, style.scalar?.channelName, style.normalChannelName];

    // The style can be animated if any of the three channels has more than one set of data.
    return channels.some((c) => c.data.length > 1 && channelNames.includes(c.name));
  }

  /** For styles that can be animated, the viewport's analysis fraction controls the interpolation
   * between the members of the data array. */
  public static getAnalysisFraction(vp: Viewport) {
    return vp.analysisFraction;
  }

  /** Changing this sets the state of the visualization for styles that can be animated. */
  public static setAnalysisFraction(vp: Viewport, fraction: number) {
    vp.analysisFraction = fraction;
  }

  /** Stops the animator in the viewport. */
  public static stopAnimation(vp: Viewport) {
    vp.setAnimator(undefined);
  }

  /** Creates and starts an animator in the viewport. */
  public static startAnimation(vp: Viewport, interruptFunc: () => void) {
    const animator: Animator = {
      // Will be called before rendering a frame as well as force the viewport to re-render every frame.
      animate: () => {
        let newFraction = 0.005 + ScientificVizApi.getAnalysisFraction(vp);

        if (1.0 < newFraction)
          newFraction = 0.0;

        ScientificVizApi.setAnalysisFraction(vp, newFraction);
        return false;
      },
      // Will be called if the animation is interrupted (e.g. the camera is moved)
      interrupt: () => {
        interruptFunc();
      },
    };

    vp.setAnimator(animator);
  }

  /** Sets up a listener to detect changes to the display style.  This includes changes to the analysisFraction. */
  public static listenForAnalysisFractionChanges(viewport: Viewport, listenerFunc: (vp: Viewport) => void) {
    return viewport.onDisplayStyleChanged.addListener((vp) => listenerFunc(vp));
  }
}

# Closest Point to Curve Sample

Copyright © Bentley Systems, Incorporated. All rights reserved.

This sample demonstrates how to calculate the closest point on a curve given a point in space.

## Purpose

The purpose of this sample is to demonstrate the following:

* Create a curve path using CurveFactory.
* Starting with a point in space, calculate the closest point on the curve.

## Description

This sample uses the [CurveFactory](https://www.itwinjs.org/v2/reference/geometry-core/curve/curvefactory/) class to create curve chains and then shows a simple method to calculate a point on the chain.

This geometry sample, like the others, uses a [BlankConnection](https://www.itwinjs.org/v2/learning/frontend/blankconnection/) to create a viewport without connecting to an iModel.  It displays geometry in the viewport using [view decorations](https://www.itwinjs.org/v2/learning/frontend/viewdecorations/).

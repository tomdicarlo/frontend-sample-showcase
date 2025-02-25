/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
import React, { useCallback, useEffect } from "react";
import { Spinner, SpinnerSize } from "@bentley/ui-core";
import { AbstractWidgetProps, PropertyDescription, PropertyRecord, PropertyValue, PropertyValueFormat, StagePanelLocation, StagePanelSection, UiItemsProvider, WidgetState } from "@bentley/ui-abstract";
import { ColumnDescription, RowItem, SimpleTableDataProvider, Table } from "@bentley/ui-components";
import { IModelApp } from "@bentley/imodeljs-frontend";
import { useActiveIModelConnection } from "@bentley/ui-framework";
import ClashReviewApi from "./ClashReviewApi";

const ClashReviewTableWidget: React.FunctionComponent = () => {
  const iModelConnection = useActiveIModelConnection();
  const [clashData, setClashData] = React.useState<any>();

  useEffect(() => {
    const removeListener = ClashReviewApi.onClashDataChanged.addListener((data: any) => {
      setClashData(data);
    });

    if (iModelConnection) {
      ClashReviewApi.setClashData(iModelConnection.contextId!)
        .catch((error) => {
          // eslint-disable-next-line no-console
          console.error(error);
        });
    }
    return () => {
      removeListener();
    };
  }, [iModelConnection]);

  const _getDataProvider = useCallback((): SimpleTableDataProvider => {

    // adding columns
    const columns: ColumnDescription[] = [];

    columns.push({ key: "elementALabel", label: "Element A Label" });
    columns.push({ key: "elementBLabel", label: "Element B Label" });
    columns.push({ key: "elementAModelIndex", label: "Element A Model" });
    columns.push({ key: "elementBModelIndex", label: "Element B Model" });
    columns.push({ key: "elementACategoryIndex", label: "Element A Category" });
    columns.push({ key: "elementBCategoryIndex", label: "Element B Category" });
    columns.push({ key: "clashType", label: "Clash Type" });

    const dataProvider: SimpleTableDataProvider = new SimpleTableDataProvider(columns);

    if (clashData !== undefined && clashData.result !== undefined) {
      // adding rows => cells => property record => value and description.
      for (const rowData of clashData.result) {
        // Concatenate the element ids to set the row key  ie. "elementAId-elementBId"
        const rowItemKey = `${rowData.elementAId}-${rowData.elementBId}`;
        const rowItem: RowItem = { key: rowItemKey, cells: [] };
        columns.forEach((column: ColumnDescription, i: number) => {
          let cellValue: string = "";
          if (column.key === "elementACategoryIndex" || column.key === "elementBCategoryIndex") {
            // Lookup the category name using the index
            cellValue = clashData.categoryList[rowData[column.key]] ? clashData.categoryList[rowData[column.key]].displayName.toString() : "";
          } else if (column.key === "elementAModelIndex" || column.key === "elementBModelIndex") {
            // Lookup the model name using the index
            cellValue = clashData.modelList[rowData[column.key]] ? clashData.modelList[rowData[column.key]].displayName.toString() : "";
          } else {
            cellValue = rowData[column.key].toString();
          }
          const value: PropertyValue = { valueFormat: PropertyValueFormat.Primitive, value: cellValue };
          const description: PropertyDescription = { displayLabel: columns[i].label, name: columns[i].key, typename: "string" };
          rowItem.cells.push({ key: columns[i].key, record: new PropertyRecord(value, description) });
        });
        dataProvider.addRow(rowItem);
      }
    }
    return dataProvider;
  }, [clashData]);

  // bonus: zooming into and highlighting element when row is selected.
  const _onRowsSelected = async (rowIterator: AsyncIterableIterator<RowItem>): Promise<boolean> => {

    if (!IModelApp.viewManager.selectedView)
      return true;

    const row = await rowIterator.next();

    // Get the concatenated element ids from the row key  ie. "elementAId-elementBId"
    const elementIds = row.value.key.split("-");
    ClashReviewApi.visualizeClash(elementIds[0], elementIds[1]);
    return true;
  };

  return (
    <>
      {!clashData ? <div style={{ height: "200px" }}><Spinner size={SpinnerSize.Small} /> Calling API...</div> :
        <div style={{ height: "100%" }}>
          <Table dataProvider={_getDataProvider()} onRowsSelected={_onRowsSelected} />
        </div>
      }
    </>
  );
};

export class ClashReviewTableWidgetProvider implements UiItemsProvider {
  public readonly id: string = "ClashReviewTableWidgetProvider";

  public provideWidgets(_stageId: string, _stageUsage: string, location: StagePanelLocation, _section?: StagePanelSection): ReadonlyArray<AbstractWidgetProps> {
    const widgets: AbstractWidgetProps[] = [];
    if (location === StagePanelLocation.Bottom) {
      widgets.push(
        {
          id: "ClashReviewTableWidget",
          label: "Clash Review Table Selector",
          defaultState: WidgetState.Open,
          // eslint-disable-next-line react/display-name
          getWidgetContent: () => <ClashReviewTableWidget />,
        }
      );
    }
    return widgets;
  }
}

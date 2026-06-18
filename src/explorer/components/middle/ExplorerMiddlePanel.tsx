import React from "react";
import { SubcategoryList } from "./SubcategoryList";
import { SubcategoryCareerList } from "./SubcategoryCareerList";
import { Breadcrumb } from "./Breadcrumb";

export const ExplorerMiddlePanel = () => {
  return (
    <div className="explorer-middle-panel">
      <Breadcrumb />
      <SubcategoryList />
      <SubcategoryCareerList />
    </div>
  );
};

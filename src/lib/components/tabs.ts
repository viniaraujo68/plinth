/** One tab of a `Tabs` row. `id` is the value the row reports. */
export interface TabItem<Id extends string = string> {
  id: Id;
  label: string;
}

import type { QueryEditorProps } from '@grafana/data';
import type { DataBricksDataSource } from 'datasource';
import type { DataBricksSourceOptions, DatabricksQuery } from '../../types';

export type EditorProps = QueryEditorProps<DataBricksDataSource, DatabricksQuery, DataBricksSourceOptions>;

export type ChangeOptions<T> = {
  propertyName: keyof T;
  runQuery: boolean;
};

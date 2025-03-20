import { DataSourcePlugin } from '@grafana/data';
import { DataSource } from './datasource';
import { ConfigEditor } from './components/ConfigEditor';
import { QueryEditor } from './components/QueryEditor';
import { DatabricksQuery, DataBricksSourceOptions } from './types';

export const plugin = new DataSourcePlugin<DataSource, DatabricksQuery, DataBricksSourceOptions>(DataSource)
  .setConfigEditor(ConfigEditor)
  .setQueryEditor(QueryEditor);

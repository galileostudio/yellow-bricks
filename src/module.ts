import { DataSourcePlugin } from '@grafana/data';
import { DataBricksDataSource } from './datasource';
import { ConfigEditor } from './components/ConfigEditor/ConfigEditor';
import { QueryEditor } from './components/QueryEditor/QueryEditor';
import { DatabricksQuery, DataBricksSourceOptions } from './types';

export const plugin = new DataSourcePlugin<DataBricksDataSource, DatabricksQuery, DataBricksSourceOptions>(DataBricksDataSource)
  .setConfigEditor(ConfigEditor)
  .setQueryEditor(QueryEditor);

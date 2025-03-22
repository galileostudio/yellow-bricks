import { DataSourceInstanceSettings, CoreApp, ScopedVars } from '@grafana/data';
import { DataSourceWithBackend, getTemplateSrv } from '@grafana/runtime';

import { DatabricksQuery, DataBricksSourceOptions, DEFAULT_QUERY } from './types';

export class DataBricksDataSource extends DataSourceWithBackend<DatabricksQuery, DataBricksSourceOptions> {
  constructor(instanceSettings: DataSourceInstanceSettings<DataBricksSourceOptions>) {
    super(instanceSettings);
  }

  getDefaultQuery(_: CoreApp): Partial<DatabricksQuery> {
    return DEFAULT_QUERY;
  }

  applyTemplateVariables(query: DatabricksQuery, scopedVars: ScopedVars) {
    return {
      ...query,
      queryText: getTemplateSrv().replace(query.queryText ?? '', scopedVars),
    };
  }

  filterQuery(query: DatabricksQuery): boolean {
    // No raw query? Ignore.
    return !!query.queryText;
  }
}

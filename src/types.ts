import { DataSourceJsonData } from '@grafana/data';
import { DataQuery } from '@grafana/schema';

export interface FieldSelection {
  column?: string;
  aggregation?: string;
  alias?: string;
}

export interface DatabricksQuery extends DataQuery {
  queryText?: string;

  // Visual mode
  format?: string;
  database?: string;
  table?: string;
  fields?: FieldSelection[];
  filters?: FilterCondition[];
  orderBy?: string;
  groupBy?: string[];
  limit?: number;
  orderDirection?: string;

  enableFilter?: boolean;
  enableGroup?: boolean;
  enableOrder?: boolean;
  enablePreview?: boolean;
}

export interface FilterCondition {
  column: string;
  operator: string;
  value?: string;
  condition?: 'AND' | 'OR';
}

export const DEFAULT_QUERY: Partial<DatabricksQuery> = {
  fields: [],
};

export type AuthType = 'token' | 'oauth-passthrough' | 'oauth-m2m' | 'azure-on-behalf-of';

export interface DataBricksSourceOptions extends DataSourceJsonData {
  host?: string;
  path?: string;
  catalog?: string;
  authType?: 'pat' | 'oauth-m2m' | 'azure-obo';
  azureCloud?: string;
  tenantId?: string;
  clientId?: string;
  retries?: number;
  pause?: number;
  timeout?: number;
  maxRows?: number;
  retryTimeout?: number;
  debug?: boolean;
  privateConnection?: string;
}

export interface DataBricksSecureJsonData {
  token?: string;
  clientSecret?: string;
  clientId?: string;
}

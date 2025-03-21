import { useAsync } from 'react-use';
import type { SelectableValue } from '@grafana/data';
import type { DataBricksDataSource } from '../../datasource';

type AsyncQueryTypeState = {
  loading: boolean;
  queryTypes: Array<SelectableValue<string>>;
  error: Error | undefined;
};

export function useQueryTypes(datasource: DataBricksDataSource): AsyncQueryTypeState {
  const result = useAsync(async () => {
    const { queryTypes } = await datasource.getAvailableQueryTypes();

    return queryTypes.map((queryType) => ({
      label: queryType,
      value: queryType,
    }));
  }, [datasource]);

  return {
    loading: result.loading,
    queryTypes: result.value ?? [],
    error: result.error,
  };
}

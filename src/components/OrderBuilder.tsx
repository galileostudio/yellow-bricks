import React from 'react';
import { InlineField, Select, Button, Input } from '@grafana/ui';
import { SelectableValue } from '@grafana/data';

interface Props {
    columns: Array<SelectableValue<string>>;
    orderBy?: string;
    orderDirection?: 'ASC' | 'DESC';
    limit?: number;
    onOrderByChange: (column: string) => void;
    onOrderDirectionChange: (dir: 'ASC' | 'DESC') => void;
    onLimitChange: (limit: number | undefined) => void;
}

export const OrderBuilder: React.FC<Props> = ({
    columns,
    orderBy,
    orderDirection = 'ASC',
    limit,
    onOrderByChange,
    onOrderDirectionChange,
    onLimitChange,
}) => {
    return (

        <div
            style={{
                padding: '8px',
                backgroundColor: 'rgb(34, 37, 43)',
                borderRadius: 2,
                marginTop: '8px',
                boxShadow: 'inset 0 0 0 1px rgba(255, 255, 255, 0.05)',
                display: 'flex',
            }}
        >

            <InlineField label="Order by column">
                <Select
                    width={20}
                    value={orderBy}
                    onChange={(v) => v.value && onOrderByChange(v.value)}
                    options={columns}
                    placeholder="Choose"
                />
            </InlineField>

            <InlineField label="Direction">
                <div style={{ display: 'flex', gap: 4 }}>
                    <Button
                        size="sm"
                        variant={orderDirection === 'ASC' ? 'primary' : 'secondary'}
                        onClick={() => onOrderDirectionChange('ASC')}
                    >
                        ASC
                    </Button>
                    <Button
                        size="sm"
                        variant={orderDirection === 'DESC' ? 'primary' : 'secondary'}
                        onClick={() => onOrderDirectionChange('DESC')}
                    >
                        DESC
                    </Button>
                </div>
            </InlineField>

            <InlineField label="Limit (optional)">
                <Input
                    type="number"
                    min={1}
                    width={12}
                    value={limit ?? ''}
                    onChange={(e) => {
                        const val = e.currentTarget.value;
                        onLimitChange(val ? parseInt(val, 10) : undefined);
                    }}
                    placeholder="e.g. 100"
                />
            </InlineField>
        </div>
    );
};

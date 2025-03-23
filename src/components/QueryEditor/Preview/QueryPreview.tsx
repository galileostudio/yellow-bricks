import React from 'react';
import { CodeEditor } from '@grafana/ui';
import { format as formatSQL } from 'sql-formatter';
interface Props {
    sql: string;
}

export const QueryPreview: React.FC<Props> = ({ sql }) => {
    if (!sql) {
        return null;
    }
    const formatted = formatSQL(sql, { language: 'sql' });
    return (
        <div style={{ marginTop: 16, padding: 12, background: 'rgb(34, 37, 43)', borderRadius: 4 }}>
            <h5 style={{ marginBottom: 8 }}>Preview SQL</h5>
            <CodeEditor
                language="sql"
                value={formatted}
                readOnly={true}
                showMiniMap={false}
                height="150px"
            />
        </div>
    );
};

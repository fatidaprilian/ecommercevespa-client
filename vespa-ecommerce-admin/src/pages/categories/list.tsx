// src/pages/categories/list.tsx
import { ICategory } from "@/types";
import { List, useTable, EditButton, ShowButton, DeleteButton } from "@refinedev/antd";
import { Space, Table } from "antd";

export const CategoryList = () => {
  const { tableProps } = useTable<ICategory>();

  return (
    <List>
      <Table {...tableProps} rowKey="id">
        <Table.Column dataIndex="id" title="ID" />
        <Table.Column dataIndex="name" title="Name" />
        <Table.Column
          title="Actions"
          dataIndex="actions"
          render={(_, record: ICategory) => (
            <Space>
              <EditButton hideText size="small" recordItemId={record.id} />
              <ShowButton hideText size="small" recordItemId={record.id} />
              <DeleteButton hideText size="small" recordItemId={record.id} />
            </Space>
          )}
        />
      </Table>
    </List>
  );
};
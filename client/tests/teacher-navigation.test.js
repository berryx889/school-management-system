import { test } from 'node:test';
import assert from 'node:assert/strict';
import { QueryClient, QueryObserver } from '@tanstack/react-query';
import { teacherDirectoryQuery, selectTeacherRows } from '../src/api/teachers.js';

const user = { id: 1, school_id: 1 };
const directory = { data: [{ id: 2, full_name: 'Demo teacher' }], total: 1 };

for (const dropdownFirst of [true, false]) {
  test(`navigation preserves teacher data when ${dropdownFirst ? 'a dropdown page' : 'Teachers'} opens first`, async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
    const options = { ...teacherDirectoryQuery(user), queryFn: async () => directory, staleTime: Infinity };
    const selected = { ...options, select: selectTeacherRows };
    const first = new QueryObserver(client, dropdownFirst ? selected : options);
    const unsubscribe = first.subscribe(() => {});
    try {
      await first.refetch();
      const second = new QueryObserver(client, dropdownFirst ? options : selected);
      const result = second.getCurrentResult();
      assert.equal(result.isLoading, false);
      if (dropdownFirst) assert.equal(result.data.data.length, 1);
      else assert.deepEqual(result.data.map(row => row.full_name), ['Demo teacher']);
      assert.deepEqual(client.getQueryData(options.queryKey), directory);
      const changed = { data: [...directory.data, { id: 3, full_name: 'Another teacher' }], total: 2 };
      client.setQueryData(options.queryKey, changed);
      assert.deepEqual(first.getCurrentResult().data, dropdownFirst ? changed.data : changed);
      second.destroy();
    } finally { unsubscribe(); first.destroy(); client.clear(); }
  });
}

test('teacher directory errors remain retryable and accounts do not share cached directories', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  const options = teacherDirectoryQuery(user);
  const observer = new QueryObserver(client, { ...options, queryFn: async () => { throw new Error('Offline'); } });
  const stop = observer.subscribe(() => {});
  try {
    await observer.refetch();
    assert.equal(observer.getCurrentResult().isError, true);
    assert.equal(observer.getCurrentResult().data, undefined);
    observer.setOptions({ ...options, queryFn: async () => directory });
    await observer.refetch();
    assert.equal(observer.getCurrentResult().data.total, 1);
    assert.equal(client.getQueryData(teacherDirectoryQuery({ id: 2, school_id: 2 }).queryKey), undefined);
  } finally { stop(); observer.destroy(); client.clear(); }
});

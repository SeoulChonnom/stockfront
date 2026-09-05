import type * as React from 'react';

import {
  TableCell as UiTableCell,
  TableHead as UiTableHead,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

export {
  Table,
  TableBody,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

// 레지스트리 `TableHead`/`TableCell` 기본값은 `whitespace-nowrap`이다.
// 이 앱의 표는 한글 헤드라인/서브라인처럼 줄바꿈이 있어야 하는 셀이
// 대다수라, nowrap이 기본이면 자식의 `wrap-anywhere`/`text-pretty`가
// 부모의 `white-space` 상속을 못 이겨 긴 문자열이 셀 밖으로 흘러넘친다.
// 그래서 기본값을 여기서 뒤집고, nowrap이 실제로 필요한 소수의 열만
// 호출부가 `whitespace-nowrap`으로 명시하게 한다.
function TableHead({ className, ...props }: React.ComponentProps<'th'>) {
  return (
    <UiTableHead className={cn('whitespace-normal', className)} {...props} />
  );
}

function TableCell({ className, ...props }: React.ComponentProps<'td'>) {
  return (
    <UiTableCell className={cn('whitespace-normal', className)} {...props} />
  );
}

export { TableCell, TableHead };

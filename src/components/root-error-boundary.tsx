import type { ReactNode } from 'react';
import { Component } from 'react';

import { StatusCard } from '@/components/shell/status-card';
import { Button } from '@/components/ui/button';

type RootErrorBoundaryProps = {
  children: ReactNode;
};

type RootErrorBoundaryState = {
  hasError: boolean;
};

/** Keeps an unexpected render error from leaving the SPA with a blank root. */
export class RootErrorBoundary extends Component<
  RootErrorBoundaryProps,
  RootErrorBoundaryState
> {
  state: RootErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): RootErrorBoundaryState {
    return { hasError: true };
  }

  handleRetry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <StatusCard
          actions={
            <Button onClick={this.handleRetry} type='button'>
              다시 시도
            </Button>
          }
          ariaLive='assertive'
          badge='500 · RENDER_ERROR'
          description='예기치 않은 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.'
          role='alert'
          title='페이지를 표시할 수 없습니다'
          tone='danger'
        />
      );
    }

    return this.props.children;
  }
}

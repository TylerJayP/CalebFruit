import React from 'react';

function StatusDisplay({ status, type }) {
  const getStatusClass = () => {
    let baseClass = 'detection-status';
    
    switch (type) {
      case 'active':
        return `${baseClass} status-active`;
      case 'loading':
        return `${baseClass} status-loading pulse`;
      case 'error':
        return `${baseClass} status-error`;
      default:
        return baseClass;
    }
  };

  return (
    <div className={getStatusClass()}>
      <strong>Status:</strong> {status}
    </div>
  );
}

export default StatusDisplay;
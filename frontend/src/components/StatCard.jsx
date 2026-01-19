import React from 'react';

function StatCard({ icon, value, label, color }) {
  return (
    <div className="stat-card-small" style={{ borderColor: color || '#ddd' }}>
      <div className="stat-card-icon" style={{ fontSize: value > 0 ? '20px' : '24px', lineHeight: '1.2' }}>
        {icon}
      </div>
      <div className="stat-card-value">{value}</div>
      <div className="stat-card-label">{label}</div>
    </div>
  );
}

export default StatCard;

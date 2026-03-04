import React, { useState, useEffect, useCallback } from 'react';
import {
  Table,
  Header,
  SpaceBetween,
  Button,
  StatusIndicator,
  Box,
  Pagination,
  CollectionPreferences,
  PropertyFilter,
  Link
} from '@cloudscape-design/components';

const FailedOrders = ({ addNotification }) => {
  const [failedOrders, setFailedOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState([]);
  const [preferences, setPreferences] = useState({
    pageSize: 20,
    visibleContent: ['retailer', 'product_name', 'customer_name', 'error_message', 'created_at', 'automation_method']
  });
  const [filtering, setFiltering] = useState({
    tokens: [],
    operation: 'and'
  });
  const [currentPageIndex, setCurrentPageIndex] = useState(1);

  const fetchFailedOrders = useCallback(async () => {
    try {
      const response = await fetch('/api/orders?status=failed&limit=100');
      if (!response.ok) {
        throw new Error('Failed to fetch failed orders');
      }
      const data = await response.json();
      setFailedOrders(data.orders || []);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch failed orders:', error);
      addNotification({
        type: 'error',
        header: 'Failed to load failed orders',
        content: error.message
      });
      setLoading(false);
    }
  }, [addNotification]);

  useEffect(() => {
    fetchFailedOrders();

    // Refresh every 60 seconds
    const interval = setInterval(fetchFailedOrders, 60000);
    return () => clearInterval(interval);
  }, [fetchFailedOrders]);

  const formatTime = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    });
  };

  const getFilteredItems = () => {
    let filtered = [...failedOrders];

    filtering.tokens.forEach(token => {
      const { propertyKey, value, operator } = token;

      filtered = filtered.filter(item => {
        const itemValue = item[propertyKey];

        switch (operator) {
          case '=':
            return itemValue === value;
          case '!=':
            return itemValue !== value;
          case ':':
            return String(itemValue).toLowerCase().includes(value.toLowerCase());
          case '!:':
            return !String(itemValue).toLowerCase().includes(value.toLowerCase());
          default:
            return true;
        }
      });
    });

    return filtered;
  };

  const getPaginatedItems = () => {
    const filtered = getFilteredItems();
    const startIndex = (currentPageIndex - 1) * preferences.pageSize;
    const endIndex = startIndex + preferences.pageSize;
    return filtered.slice(startIndex, endIndex);
  };



  const columnDefinitions = [
    {
      id: 'retailer',
      header: 'Retailer',
      cell: item => item.retailer || 'Unknown',
      sortingField: 'retailer'
    },
    {
      id: 'product_name',
      header: 'Product',
      cell: item => (
        <Link href={`/orders/${item.id}`}>
          {item.product_name || 'Unknown Product'}
        </Link>
      ),
      sortingField: 'product_name'
    },
    {
      id: 'customer_name',
      header: 'Customer',
      cell: item => item.customer_name || 'Unknown',
      sortingField: 'customer_name'
    },
    {
      id: 'automation_method',
      header: 'Method',
      cell: item => item.automation_method || 'Unknown',
      sortingField: 'automation_method'
    },
    {
      id: 'error_message',
      header: 'Error',
      cell: item => (
        <Box variant="small" color="text-status-error">
          {item.error_message || 'Unknown error'}
        </Box>
      )
    },
    {
      id: 'status',
      header: 'Status',
      cell: item => (
        <StatusIndicator type="error">
          Failed
        </StatusIndicator>
      )
    },
    {
      id: 'created_at',
      header: 'Created',
      cell: item => formatTime(item.created_at),
      sortingField: 'created_at'
    },

  ];

  const propertyFilteringProperties = [
    {
      key: 'retailer',
      operators: [':', '!:', '=', '!='],
      propertyLabel: 'Retailer',
      groupValuesLabel: 'Retailer values'
    },
    {
      key: 'product_name',
      operators: [':', '!:', '=', '!='],
      propertyLabel: 'Product',
      groupValuesLabel: 'Product values'
    },
    {
      key: 'customer_name',
      operators: [':', '!:', '=', '!='],
      propertyLabel: 'Customer',
      groupValuesLabel: 'Customer values'
    },
    {
      key: 'automation_method',
      operators: [':', '!:', '=', '!='],
      propertyLabel: 'Method',
      groupValuesLabel: 'Method values'
    }
  ];

  const filteredItems = getFilteredItems();
  const paginatedItems = getPaginatedItems();

  return (
    <div className="stagger-1">
      {/* Premium Failure Header */}
      <div className="aiva-card" style={{ marginBottom: '3rem', padding: '3rem', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'relative', zIndex: 2 }}>
          <h1 className="stylish-title" style={{ marginBottom: '1rem' }}>Post-Mortem Analysis</h1>
          <p style={{
            color: '#94a3b8',
            fontSize: '1.2rem',
            maxWidth: '900px',
            lineHeight: '1.6',
            marginBottom: '0'
          }}>
            Review mission failures and system terminations. Analyze terminal logs to identify environmental blocks or target site mutations.
          </p>
        </div>

        {/* Decorative elements */}
        <div style={{
          position: 'absolute',
          top: '-100px',
          right: '-100px',
          width: '400px',
          height: '400px',
          background: 'radial-gradient(circle, rgba(244, 63, 94, 0.1) 0%, transparent 70%)',
          borderRadius: '50%'
        }}></div>
      </div>

      <div className="aiva-card stagger-2" style={{ padding: '2rem' }}>
        <Table
          header={
            <Header
              variant="h2"
              counter={<span className="glow-text-indigo" style={{ fontWeight: 800 }}>{filteredItems.length}</span>}
              actions={
                <SpaceBetween direction="horizontal" size="s">
                  <button
                    className="btn-stylish"
                    style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)' }}
                    onClick={fetchFailedOrders}
                    disabled={loading}
                  >
                    <span className={`material-icons ${loading ? 'rotating' : ''}`} style={{ fontSize: '18px', marginRight: '8px' }}>refresh</span>
                    {loading ? 'SYNCING...' : 'REFRESH LOGS'}
                  </button>
                </SpaceBetween>
              }
            >
              <span style={{ color: 'white' }}>Mission Terminations</span>
            </Header>
          }
          columnDefinitions={columnDefinitions}
          items={paginatedItems}
          loading={loading}
          selectedItems={selectedItems}
          onSelectionChange={({ detail }) => setSelectedItems(detail.selectedItems)}
          selectionType="multi"
          filter={
            <PropertyFilter
              query={filtering}
              onChange={({ detail }) => {
                setFiltering(detail);
                setCurrentPageIndex(1);
              }}
              countText={`${filteredItems.length} matches`}
              expandToViewport
              filteringProperties={propertyFilteringProperties}
              filteringPlaceholder="Scan logs..."
            />
          }
          pagination={
            <Pagination
              currentPageIndex={currentPageIndex}
              onChange={({ detail }) => setCurrentPageIndex(detail.currentPageIndex)}
              pagesCount={Math.ceil(filteredItems.length / preferences.pageSize)}
            />
          }
          empty={
            <Box textAlign="center" padding="xxl">
              <SpaceBetween size="m">
                <Box variant="h3" color="inherit">Zero Failures Recorded</Box>
                <Box variant="p" color="text-body-secondary">Mission integrity is at 100%. All sectors are operational.</Box>
                <button className="btn-stylish" onClick={fetchFailedOrders}>RE-SCAN LOGS</button>
              </SpaceBetween>
            </Box>
          }
        />
      </div>
    </div>
  );
};

export default FailedOrders;
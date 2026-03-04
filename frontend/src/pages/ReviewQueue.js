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
  Link,
  Alert
} from '@cloudscape-design/components';

const ReviewQueue = ({ addNotification }) => {
  const [reviewItems, setReviewItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState([]);
  const [preferences, setPreferences] = useState({
    pageSize: 20,
    visibleContent: ['retailer', 'product_name', 'customer_name', 'automation_method', 'product_price', 'error_message', 'created_at']
  });
  const [filtering, setFiltering] = useState({
    tokens: [],
    operation: 'and'
  });
  const [currentPageIndex, setCurrentPageIndex] = useState(1);
  const [errorCount, setErrorCount] = useState(0);
  const [hasError, setHasError] = useState(false);
  const [completingReviews, setCompletingReviews] = useState(false);

  const fetchReviewQueue = useCallback(async () => {
    if (errorCount >= 5) {
      setHasError(true);
      return;
    }

    try {
      const response = await fetch('/api/review/queue');
      if (!response.ok) {
        throw new Error('Failed to fetch review queue');
      }
      const data = await response.json();
      const newReviewItems = data.orders || [];
      setReviewItems(newReviewItems);

      // Update selected items if they still exist
      if (selectedItems.length > 0) {
        const selectedIds = selectedItems.map(item => item.id);
        const updatedSelection = newReviewItems.filter(item => selectedIds.includes(item.id));
        setSelectedItems(updatedSelection);
      }

      setLoading(false);
      setErrorCount(0);
      setHasError(false);
    } catch (error) {
      console.error('Failed to fetch review queue:', error);
      const newErrorCount = errorCount + 1;
      setErrorCount(newErrorCount);

      if (errorCount === 0) {
        addNotification({
          type: 'error',
          header: 'Failed to load review queue',
          content: error.message
        });
      }

      if (newErrorCount >= 5) {
        setHasError(true);
      }

      setLoading(false);
    }
  }, [errorCount, selectedItems, addNotification]);

  useEffect(() => {
    fetchReviewQueue();

    const interval = setInterval(() => {
      if (errorCount < 5) {
        fetchReviewQueue();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchReviewQueue, errorCount]);

  const formatTime = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short'
    });
  };

  const getFilteredItems = () => {
    let filtered = [...reviewItems];
    filtering.tokens.forEach(token => {
      const { propertyKey, value, operator } = token;
      filtered = filtered.filter(item => {
        const itemValue = item[propertyKey];
        switch (operator) {
          case ':': return String(itemValue).toLowerCase().includes(value.toLowerCase());
          case '!:': return !String(itemValue).toLowerCase().includes(value.toLowerCase());
          case '=': return String(itemValue) === value;
          case '!=': return String(itemValue) !== value;
          default: return true;
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

  const handleBulkComplete = async () => {
    if (selectedItems.length === 0) {
      addNotification({
        type: 'warning',
        header: 'No items selected',
        content: 'Please select items to complete review for'
      });
      return;
    }

    setCompletingReviews(true);
    try {
      const promises = selectedItems.map(item =>
        fetch(`/api/review/${item.id}/resolve`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            status: 'completed',
            human_review_notes: 'Bulk completed via review queue'
          })
        })
      );

      await Promise.all(promises);

      addNotification({
        type: 'success',
        header: 'Reviews completed',
        content: `Successfully completed ${selectedItems.length} reviews`
      });

      setSelectedItems([]);
      fetchReviewQueue();
    } catch (error) {
      addNotification({
        type: 'error',
        header: 'Failed to complete reviews',
        content: error.message
      });
    } finally {
      setCompletingReviews(false);
    }
  };

  const columnDefinitions = [
    {
      id: 'retailer',
      header: 'Retailer',
      cell: item => item.retailer,
      sortingField: 'retailer'
    },
    {
      id: 'product_name',
      header: 'Product',
      cell: item => (
        <Link href={`/orders/${item.id}`}>
          {item.product_name}
        </Link>
      ),
      sortingField: 'product_name'
    },
    {
      id: 'customer_name',
      header: 'Customer',
      cell: item => item.customer_name,
      sortingField: 'customer_name'
    },
    {
      id: 'automation_method',
      header: 'Method',
      cell: item => item.automation_method,
      sortingField: 'automation_method'
    },
    {
      id: 'product_price',
      header: 'Price',
      cell: item => item.product_price ? `$${item.product_price.toFixed(2)}` : 'N/A',
      sortingField: 'product_price'
    },
    {
      id: 'error_message',
      header: 'Review Reason',
      cell: item => (
        <Box variant="small" color="text-status-warning">
          {item.error_message || item.human_review_notes || 'Requires human review'}
        </Box>
      )
    },
    {
      id: 'status',
      header: 'Status',
      cell: item => (
        <StatusIndicator type="warning">
          Requires Review
        </StatusIndicator>
      )
    },
    {
      id: 'created_at',
      header: 'Created',
      cell: item => formatTime(item.created_at),
      sortingField: 'created_at'
    }
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

  if (hasError) {
    return (
      <SpaceBetween size="l">
        <Header variant="h1">Review Queue</Header>
        <Alert
          type="error"
          header="Service Unavailable"
          action={
            <Button
              onClick={() => {
                setErrorCount(0);
                setHasError(false);
                fetchReviewQueue();
              }}
            >
              Retry
            </Button>
          }
        >
          The review queue service is temporarily unavailable. This may be due to database connectivity issues.
        </Alert>
      </SpaceBetween>
    );
  }

  return (
    <div className="stagger-1">
      {/* Premium Review Header */}
      <div className="aiva-card" style={{ marginBottom: '3rem', padding: '3rem', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'relative', zIndex: 2 }}>
          <h1 className="stylish-title" style={{ marginBottom: '1rem' }}>Human Intervention Core</h1>
          <p style={{
            color: '#94a3b8',
            fontSize: '1.2rem',
            maxWidth: '900px',
            lineHeight: '1.6',
            marginBottom: '0'
          }}>
            Tactical oversight for complex scenarios. AIVA has encountered anomalies that requires human intuition to resolve. Review the mission context and authorize the next vector.
          </p>
        </div>

        {/* Decorative elements */}
        <div style={{
          position: 'absolute',
          top: '-100px',
          right: '-100px',
          width: '400px',
          height: '400px',
          background: 'radial-gradient(circle, rgba(245, 158, 11, 0.1) 0%, transparent 70%)',
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
                    onClick={fetchReviewQueue}
                    disabled={loading}
                  >
                    <span className={`material-icons ${loading ? 'rotating' : ''}`} style={{ fontSize: '18px', marginRight: '8px' }}>refresh</span>
                    {loading ? 'SYNCING...' : 'REFRESH QUEUE'}
                  </button>

                  {selectedItems.length > 0 && (
                    <button
                      className="btn-stylish"
                      onClick={handleBulkComplete}
                      disabled={completingReviews}
                    >
                      <span className="material-icons" style={{ marginRight: '8px' }}>check_circle</span>
                      RESOLVE {selectedItems.length} ANOMALIES
                    </button>
                  )}
                </SpaceBetween>
              }
            >
              <span style={{ color: 'white' }}>Mission Anomalies</span>
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
              filteringPlaceholder="Filter interventions..."
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
                <Box variant="h3" color="inherit">Zero Anomalies Detected</Box>
                <Box variant="p" color="text-body-secondary">All autonomous agents are operating within nominal parameters.</Box>
                <button className="btn-stylish" onClick={fetchReviewQueue}>RE-SCAN CHANNELS</button>
              </SpaceBetween>
            </Box>
          }
          trackBy="id"
        />
      </div>
    </div>
  );
};

export default ReviewQueue;
/**
 * Order Dashboard - Production AIVA System
 * Following Cloudscape Design System patterns and best practices
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Header,
  SpaceBetween,
  Button,
  ButtonDropdown,
  Table,
  Box,
  StatusIndicator,
  Alert,
  Modal,
  Pagination,
  CollectionPreferences,
  PropertyFilter,
  Link,
  Popover,
  Container,
  ColumnLayout
} from '@cloudscape-design/components';

import CreateOrderWizard from './CreateOrderWizard';
import VoiceOrderAssistant from './VoiceOrderAssistant';
import { API_BASE_URL } from '../services/api';
// import useResizeObserverFix from '../hooks/useResizeObserverFix';

// ResizeObserver errors are handled globally by errorSuppression utility

const OrderDashboard = ({ addNotification }) => {
  const [orders, setOrders] = useState([]);
  const [retailers, setRetailers] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState([]);
  const [preferences, setPreferences] = useState({
    pageSize: 20,
    visibleContent: ['id', 'retailer', 'product', 'status', 'method', 'created', 'actions']
  });
  const [filtering, setFiltering] = useState({
    tokens: [],
    operation: 'and'
  });
  const [currentPageIndex, setCurrentPageIndex] = useState(1);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showCreateOrderWizard, setShowCreateOrderWizard] = useState(false);
  const [showVoiceAssistant, setShowVoiceAssistant] = useState(false);
  const [selectedPreviewOrder, setSelectedPreviewOrder] = useState(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [showScanModal, setShowScanModal] = useState(false);
  const [scanImage, setScanImage] = useState(null);
  const [scanResult, setScanResult] = useState('');
  const [scanLoading, setScanLoading] = useState(false);

  const [errorCount, setErrorCount] = useState(0);
  const [hasError, setHasError] = useState(false);
  const [queueStatus, setQueueStatus] = useState('active'); // active, paused
  const fetchDashboardData = useCallback(async () => {
    // Skip if we've had too many errors
    if (errorCount >= 5) {
      setHasError(true);
      return;
    }

    try {
      const [ordersRes, retailersRes, queueRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/orders?limit=500`),
        fetch(`${API_BASE_URL}/api/config/retailers`),
        fetch(`${API_BASE_URL}/api/queue/status/`)
      ]);

      if (!ordersRes.ok || !retailersRes.ok || !queueRes.ok) {
        throw new Error('Failed to fetch dashboard data');
      }

      const ordersData = await ordersRes.json();
      const retailersData = await retailersRes.json();
      const queueData = await queueRes.json();

      setOrders(Array.isArray(ordersData.orders) ? ordersData.orders : []);
      setRetailers(retailersData);
      setQueueStatus(queueData.status || 'active');
      setLoading(false);
      setErrorCount(0);
      setHasError(false);

    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      setErrorCount(prev => {
        const newCount = prev + 1;

        // Only show notification for first error
        if (prev === 0) {
          addNotification({
            type: 'error',
            header: 'Dashboard Error',
            content: 'Dashboard temporarily unavailable. Please try again later.'
          });
        }

        // Stop polling after 5 errors
        if (newCount >= 5) {
          setHasError(true);
        }

        return newCount;
      });

      setLoading(false);
    }
  }, [addNotification, errorCount]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Stabilize polling - only restart if essentials change
  useEffect(() => {
    const hasActiveOrders = orders.some(order => ['pending', 'processing'].includes(order.status));

    if (hasActiveOrders && !hasError && errorCount < 5) {
      const interval = setInterval(fetchDashboardData, 30000);
      return () => clearInterval(interval);
    }
  }, [hasError, errorCount, fetchDashboardData]); // Notice 'orders' removed from deps to prevent loop if fetch is fast



  const handleQueuePause = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/queue/pause`, { method: 'POST' });

      if (!response.ok) {
        throw new Error('Failed to pause queue');
      }

      addNotification({
        type: 'success',
        header: 'Queue Paused',
        content: 'Order processing queue has been paused successfully'
      });

      setQueueStatus('paused');
      fetchDashboardData();

    } catch (error) {
      addNotification({
        type: 'error',
        header: 'Queue Pause Failed',
        content: `Failed to pause queue: ${error.message}`
      });
    }
  };

  const handleQueueResume = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/queue/resume`, { method: 'POST' });

      if (!response.ok) {
        throw new Error('Failed to resume queue');
      }

      addNotification({
        type: 'success',
        header: 'Queue Resumed',
        content: 'Order processing queue has been resumed successfully'
      });

      setQueueStatus('active');
      fetchDashboardData();

    } catch (error) {
      addNotification({
        type: 'error',
        header: 'Queue Resume Failed',
        content: `Failed to resume queue: ${error.message}`
      });
    }
  };

  const handleDeleteCompleted = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/orders/cleanup/completed`, { method: 'DELETE' });

      if (!response.ok) {
        throw new Error('Failed to delete completed orders');
      }

      const result = await response.json();

      addNotification({
        type: 'success',
        header: 'Orders Deleted',
        content: `${result.deleted_count || 0} completed orders have been deleted`
      });

      fetchDashboardData();

    } catch (error) {
      addNotification({
        type: 'error',
        header: 'Delete Failed',
        content: `Failed to delete completed orders: ${error.message}`
      });
    }
  };

  const handleForceDeleteOrder = async (orderId) => {
    const order = orders.find(o => o.id === orderId);
    const productName = order?.product?.name || 'Unknown Product';
    const shortId = orderId.substring(0, 8);

    if (!window.confirm(`Are you sure you want to delete this order?\n\nOrder: ${shortId}\nProduct: ${productName}\n\nThis action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/orders/${orderId}/force`, { method: 'DELETE' });

      if (!response.ok) {
        throw new Error('Failed to delete order');
      }

      addNotification({
        type: 'success',
        header: 'Order Deleted',
        content: `Order ${shortId} (${productName}) has been deleted successfully`
      });

      fetchDashboardData();

    } catch (error) {
      addNotification({
        type: 'error',
        header: 'Delete Failed',
        content: `Failed to delete order: ${error.message}`
      });
    }
  };

  const handleUploadCSV = () => {
    window.location.href = '/orders/batch-upload';
  };



  const handleRetryOrder = async (orderId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/orders/${orderId}/retry`, { method: 'POST' });
      if (response.ok) {
        addNotification({
          type: 'success',
          header: 'Order Retry',
          content: `Order ${orderId.substring(0, 8)} has been queued for retry`
        });
        fetchDashboardData();
      } else {
        throw new Error('Failed to retry order');
      }
    } catch (error) {
      addNotification({
        type: 'error',
        header: 'Retry Failed',
        content: `Failed to retry order: ${error.message}`
      });
    }
  };

  const handleBulkCancel = async () => {
    if (selectedItems.length === 0) return;

    try {
      const cancelPromises = selectedItems
        .filter(order => order.status === 'pending')
        .map(order =>
          fetch(`${API_BASE_URL}/api/orders/${order.id}/cancel`, { method: 'POST' })
        );

      await Promise.all(cancelPromises);

      addNotification({
        type: 'success',
        header: 'Orders Cancelled',
        content: `${cancelPromises.length} order(s) cancelled successfully`
      });
      setSelectedItems([]);
      fetchDashboardData();
    } catch (error) {
      addNotification({
        type: 'error',
        header: 'Cancellation Failed',
        content: `Failed to cancel orders: ${error.message}`
      });
    } finally {
      setShowCancelModal(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedItems.length === 0) return;

    const orderList = selectedItems.map(order =>
      `• ${order.id.substring(0, 8)} - ${order.product?.name || 'Unknown Product'}`
    ).join('\n');

    if (!window.confirm(`Are you sure you want to delete ${selectedItems.length} selected order(s)?\n\n${orderList}\n\nThis action cannot be undone.`)) {
      return;
    }

    try {
      const deletePromises = selectedItems.map(order =>
        fetch(`${API_BASE_URL}/api/orders/${order.id}/force`, { method: 'DELETE' })
      );

      await Promise.all(deletePromises);

      addNotification({
        type: 'success',
        header: 'Orders Deleted',
        content: `${selectedItems.length} order(s) deleted successfully`
      });
      setSelectedItems([]);
      fetchDashboardData();
    } catch (error) {
      addNotification({
        type: 'error',
        header: 'Delete Failed',
        content: `Failed to delete orders: ${error.message}`
      });
    }
  };

  const handleVoiceOrderCreated = (orderId) => {
    addNotification({
      type: 'success',
      header: 'Voice Order Created',
      content: `Order ${orderId} has been created successfully via voice`
    });
    fetchDashboardData();
    setShowVoiceAssistant(false);
  };

  const canCancelSelected = () => {
    return selectedItems.every(order => order.status === 'pending');
  };

  const getStatusIndicator = (status, tooltip = null) => {
    const statusComponent = (() => {
      switch (status) {
        case 'completed':
          return <StatusIndicator type="success">Completed</StatusIndicator>;
        case 'processing':
          return <StatusIndicator type="in-progress">Processing</StatusIndicator>;
        case 'failed':
          return <StatusIndicator type="error">Failed</StatusIndicator>;
        case 'requires_human':
          return <StatusIndicator type="warning">Requires Human</StatusIndicator>;
        default:
          return <StatusIndicator type="pending">Pending</StatusIndicator>;
      }
    })();

    // Add popover for failed status with error details
    if (status === 'failed' && tooltip) {
      return (
        <Popover
          header="Order Failed"
          content={tooltip}
          dismissButton={false}
          position="top"
          size="medium"
        >
          {statusComponent}
        </Popover>
      );
    }

    return statusComponent;
  };

  const formatTime = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short'
    });
  };

  const getFilteredOrders = useMemo(() => {
    if (!Array.isArray(orders)) {
      return [];
    }
    let filtered = [...orders];

    filtering.tokens.forEach(token => {
      const { propertyKey, value, operator } = token;
      filtered = filtered.filter(order => {
        const orderValue = order[propertyKey];
        switch (operator) {
          case '=':
            return orderValue === value;
          case '!=':
            return orderValue !== value;
          case ':':
            return String(orderValue).toLowerCase().includes(value.toLowerCase());
          case '!:':
            return !String(orderValue).toLowerCase().includes(value.toLowerCase());
          default:
            return true;
        }
      });
    });

    return filtered;
  }, [orders, filtering]);

  const getPaginatedOrders = useMemo(() => {
    const startIndex = (currentPageIndex - 1) * preferences.pageSize;
    const endIndex = startIndex + preferences.pageSize;
    return getFilteredOrders.slice(startIndex, endIndex);
  }, [getFilteredOrders, currentPageIndex, preferences.pageSize]);

  const orderColumns = [
    {
      id: 'id',
      header: 'Order ID',
      cell: item => (
        <Link onFollow={(e) => { e.preventDefault(); setSelectedPreviewOrder(item); }}>
          {item.id?.substring(0, 8) || 'N/A'}
        </Link>
      ),
      sortingField: 'id',
      isRowHeader: true
    },
    {
      id: 'retailer',
      header: 'Retailer',
      cell: item => retailers[item.retailer]?.name || item.retailer,
      sortingField: 'retailer'
    },
    {
      id: 'product',
      header: 'Product',
      cell: item => {
        const product = item.product;
        if (!product || !product.name) return 'N/A';

        const details = [];
        if (product.size && product.size !== '-' && product.size !== 'N/A') details.push(product.size);
        if (product.color && product.color !== '-' && product.color !== 'N/A') details.push(product.color);

        return (
          <Box>
            <div>{product.name}</div>
            {details.length > 0 && (
              <Box variant="small" color="text-body-secondary">
                {details.join(' • ')}
              </Box>
            )}
          </Box>
        );
      }
    },
    {
      id: 'status',
      header: 'Status',
      cell: item => getStatusIndicator(item.status, item.status_tooltip),
      sortingField: 'status'
    },
    {
      id: 'method',
      header: 'Method',
      cell: item => item.automation_method_display || item.automation_method || 'N/A',
      sortingField: 'automation_method'
    },
    {
      id: 'created',
      header: 'Created',
      cell: item => formatTime(item.created_at),
      sortingField: 'created_at'
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: item => {
        const actions = [
          {
            id: 'delete',
            text: 'Delete',
            iconName: 'remove'
          }
        ];

        if (item.status === 'failed') {
          actions.unshift({
            id: 'retry',
            text: 'Retry',
            iconName: 'refresh'
          });
        }

        return (
          <ButtonDropdown
            variant="icon"
            ariaLabel={`Actions for order ${item.id?.substring(0, 8) || 'N/A'}`}
            items={actions}
            onItemClick={(e) => {
              switch (e.detail.id) {
                case 'retry':
                  handleRetryOrder(item.id);
                  break;
                case 'delete':
                  handleForceDeleteOrder(item.id);
                  break;
                default:
                  break;
              }
            }}
            expandToViewport={true}
          />
        );
      },
      minWidth: 60
    }

  ];

  const propertyFilteringProperties = [
    {
      key: 'status',
      operators: ['=', '!='],
      propertyLabel: 'Status',
      groupValuesLabel: 'Status values'
    },
    {
      key: 'retailer',
      operators: ['=', '!=', ':', '!:'],
      propertyLabel: 'Retailer',
      groupValuesLabel: 'Retailer values'
    }
  ];





  const filteredOrders = getFilteredOrders;
  const paginatedOrders = getPaginatedOrders;

  if (hasError) {
    return (
      <SpaceBetween size="l">
        <Header variant="h1">AIVA Dashboard</Header>
        <Alert
          type="error"
          header="Dashboard Service Unavailable"
          action={
            <Button
              onClick={() => {
                setErrorCount(0);
                setHasError(false);
                fetchDashboardData();
              }}
            >
              Retry
            </Button>
          }
        >
          The dashboard service is temporarily unavailable. This may be due to connectivity issues.
        </Alert>
      </SpaceBetween>
    );
  }

  return (
    <div className="stagger-1">
      {/* Premium Dashboard Header */}
      <div className="aiva-card" style={{ marginBottom: '2.5rem', padding: '3rem', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'relative', zIndex: 2 }}>
          <h1 className="stylish-title" style={{ marginBottom: '1rem' }}>Order Management</h1>
          <p style={{
            color: '#94a3b8',
            fontSize: '1.2rem',
            maxWidth: '900px',
            lineHeight: '1.6',
            marginBottom: '0'
          }}>
            Monitor your automation fleet in real-time. AIVA handles the complex web interactions while you stay in control of the mission outcomes.
          </p>
        </div>

        {/* Decorative elements for visual depth */}
        <div style={{
          position: 'absolute',
          top: '-100px',
          right: '-100px',
          width: '400px',
          height: '400px',
          background: 'radial-gradient(circle, rgba(99, 102, 241, 0.1) 0%, transparent 70%)',
          borderRadius: '50%'
        }}></div>
      </div>

      {/* Live AI Agent Fleet Tracker (Replaces old Globe Widget) */}
      <div className="aiva-fleet-tracker stagger-2" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem' }}>
          <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.4rem' }}>
            <span className="material-icons" style={{ color: '#10b981' }}>cell_tower</span>
            Live AI Agent Fleet
          </h2>
          <div style={{ display: 'flex', gap: '15px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', color: '#94a3b8' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981' }}></span> Active Nodes
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', color: '#94a3b8' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b', boxShadow: '0 0 8px #f59e0b' }}></span> Processing
            </span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
          {/* Node 1 */}
          <div style={{ background: 'rgba(0,0,0,0.4)', borderRadius: '12px', padding: '1.5rem', border: '1px solid rgba(16, 185, 129, 0.3)', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: '#10b981' }}></div>
            <div style={{ color: '#94a3b8', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '5px' }}>Amazon Compute Node</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'white', marginBottom: '10px' }}>Nova Act V1</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#10b981', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '4px' }}><span className="material-icons" style={{ fontSize: '14px' }}>check_circle</span> Online</span>
              <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>{orders.filter(o => o.status === 'completed').length} Missions</span>
            </div>
          </div>

          {/* Node 2 */}
          <div style={{ background: 'rgba(0,0,0,0.4)', borderRadius: '12px', padding: '1.5rem', border: '1px solid rgba(245, 158, 11, 0.3)', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: '#f59e0b' }}></div>
            <div style={{ color: '#94a3b8', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '5px' }}>Vision Processing</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'white', marginBottom: '10px' }}>Claude 3 Haiku</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#f59e0b', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '4px' }}><span className="material-icons" style={{ fontSize: '14px' }}>sync</span> Identifying</span>
              <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Active Scans</span>
            </div>
          </div>

          {/* Node 3 */}
          <div style={{ background: 'rgba(0,0,0,0.4)', borderRadius: '12px', padding: '1.5rem', border: '1px solid rgba(99, 102, 241, 0.3)', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: '#6366f1' }}></div>
            <div style={{ color: '#94a3b8', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '5px' }}>Active Operations</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'white', marginBottom: '10px' }}>{orders.filter(o => ['pending', 'processing'].includes(o.status)).length} Orders</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#6366f1', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '4px' }}><span className="material-icons" style={{ fontSize: '14px' }}>electric_bolt</span> Routing</span>
              <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Real-time</span>
            </div>
          </div>
        </div>
      </div>

      <div className="aiva-card stagger-2" style={{ padding: '2rem' }}>
        {/* Orders Table with High-Contrast Header */}
        <Table
          header={
            <Header
              variant="h2"
              counter={<span className="glow-text-indigo" style={{ fontWeight: 800 }}>{filteredOrders.length}</span>}
              actions={
                <SpaceBetween direction="horizontal" size="s">
                  <button
                    className="btn-stylish"
                    onClick={fetchDashboardData}
                    disabled={loading}
                    style={{ padding: '0.6rem 1.2rem' }}
                  >
                    <span className={`material-icons ${loading ? 'rotating' : ''}`} style={{ fontSize: '18px', marginRight: '8px' }}>refresh</span>
                    {loading ? 'SYNCING...' : 'REFRESH'}
                  </button>

                  {selectedItems.length > 0 && (
                    <Button variant="primary" iconName="remove" onClick={handleBulkDelete}>
                      Delete Selected ({selectedItems.length})
                    </Button>
                  )}

                  <ButtonDropdown
                    variant="primary"
                    items={[
                      { id: 'create-wizard', text: 'Create New', iconName: 'add-plus' },
                      { id: 'voice-assistant', text: '🎤 Voice Order', iconName: 'microphone' },
                      { id: 'scan-item', text: '📷 Scan to Order', iconName: 'view-full' },
                      { id: 'upload-csv', text: 'Upload CSV', iconName: 'upload' },
                      { id: 'pause-queue', text: 'Pause Queue', iconName: 'status-stopped', disabled: queueStatus === 'paused' },
                      { id: 'resume-queue', text: 'Resume Queue', iconName: 'status-in-progress', disabled: queueStatus === 'active' },
                      { id: 'delete', text: 'Cleanup Completed' },
                    ]}
                    onItemClick={(e) => {
                      switch (e.detail.id) {
                        case 'create-wizard': window.location.href = '/orders/create'; break;
                        case 'voice-assistant': setShowVoiceAssistant(true); break;
                        case 'scan-item': setShowScanModal(true); break;
                        case 'upload-csv': handleUploadCSV(); break;
                        case 'pause-queue': handleQueuePause(); break;
                        case 'resume-queue': handleQueueResume(); break;
                        case 'delete': handleDeleteCompleted(); break;
                        default: break;
                      }
                    }}
                  >
                    COMMAND ACTIONS
                  </ButtonDropdown>
                </SpaceBetween>
              }
            >
              <span style={{ color: 'white', letterSpacing: '0.5px' }}>Active Missions</span>
            </Header>
          }
          columnDefinitions={orderColumns}
          items={paginatedOrders}
          loading={loading}
          loadingText="Loading orders..."
          selectedItems={selectedItems}
          onSelectionChange={({ detail }) => setSelectedItems(detail.selectedItems)}
          selectionType="multi"
          ariaLabels={{
            selectionGroupLabel: "Items selection",
            allItemsSelectionLabel: ({ selectedItems }) =>
              `${selectedItems.length} ${selectedItems.length === 1 ? "item" : "items"} selected`,
            itemSelectionLabel: ({ selectedItems }, item) => {
              const isItemSelected = selectedItems.filter(i => i.id === item.id).length;
              return `${item.product?.name || 'Order'} is ${isItemSelected ? "" : "not "}selected`;
            }
          }}
          filter={
            <PropertyFilter
              query={filtering}
              onChange={({ detail }) => {
                setFiltering(detail);
                setCurrentPageIndex(1);
              }}
              countText={`${filteredOrders.length} matches`}
              expandToViewport={true}
              filteringProperties={propertyFilteringProperties}
              filteringPlaceholder="Find orders"
            />
          }
          pagination={
            <Pagination
              currentPageIndex={currentPageIndex}
              onChange={({ detail }) => setCurrentPageIndex(detail.currentPageIndex)}
              pagesCount={Math.ceil(filteredOrders.length / preferences.pageSize)}
              ariaLabels={{
                nextPageLabel: "Next page",
                previousPageLabel: "Previous page",
                pageLabel: pageNumber => `Page ${pageNumber} of all pages`
              }}
            />
          }
          preferences={
            <CollectionPreferences
              title="Preferences"
              confirmLabel="Confirm"
              cancelLabel="Cancel"
              preferences={preferences}
              onConfirm={({ detail }) => setPreferences(detail)}
              pageSizePreference={{
                title: "Page size",
                options: [
                  { value: 10, label: "10 orders" },
                  { value: 20, label: "20 orders" },
                  { value: 50, label: "50 orders" }
                ]
              }}
              visibleContentPreference={{
                title: "Select visible columns",
                options: [{
                  label: "Order properties",
                  options: orderColumns.map(({ id, header }) => ({
                    id,
                    label: header
                  }))
                }]
              }}
            />
          }
          trackBy="id"
          empty={
            <Box margin={{ vertical: 'xs' }} textAlign="center" color="inherit">
              <SpaceBetween size="m">
                <b>No orders</b>
                <Box variant="p" color="inherit">
                  Create a test order to see automation in action.
                </Box>
                <Button
                  variant="primary"
                  iconName="gen-ai"
                  onClick={() => window.location.href = '/orders/create'}
                >
                  Create Order
                </Button>
              </SpaceBetween>
            </Box>
          }
        />

        {/* Create Order Wizard */}
        {showCreateOrderWizard && (
          <CreateOrderWizard
            visible={showCreateOrderWizard}
            onDismiss={() => setShowCreateOrderWizard(false)}
            onOrderCreated={(orderId) => {
              addNotification({
                type: 'success',
                header: 'Order Created',
                content: `Order ${orderId} has been created successfully`
              });
              fetchDashboardData();
              setShowCreateOrderWizard(false);
            }}
            addNotification={addNotification}
          />
        )}



        {/* Bulk Cancel Modal */}
        <Modal
          visible={showCancelModal}
          onDismiss={() => setShowCancelModal(false)}
          header="Cancel Selected Orders"
          closeAriaLabel="Close modal"
          footer={
            <Box float="right">
              <SpaceBetween direction="horizontal" size="xs">
                <Button variant="link" onClick={() => setShowCancelModal(false)}>
                  Cancel
                </Button>
                <Button variant="primary" onClick={handleBulkCancel}>
                  Cancel {selectedItems.length} Order{selectedItems.length > 1 ? 's' : ''}
                </Button>
              </SpaceBetween>
            </Box>
          }
        >
          <SpaceBetween size="m">
            <Box variant="span">
              Are you sure you want to cancel {selectedItems.length} selected order{selectedItems.length > 1 ? 's' : ''}?
            </Box>
            <Alert type="warning">
              This action cannot be undone. The orders will be removed from the processing queue.
            </Alert>
            <Box variant="small">
              Selected orders:
              <ul style={{ marginLeft: '20px', paddingLeft: '0' }}>
                {selectedItems.slice(0, 5).map(order => (
                  <li key={order.id}>{order.product?.name || 'Unknown Product'}</li>
                ))}
                {selectedItems.length > 5 && (
                  <li>... and {selectedItems.length - 5} more</li>
                )}
              </ul>
            </Box>
          </SpaceBetween>
        </Modal>

        {/* Live Preview Modal */}
        {selectedPreviewOrder && !showReceipt && (
          <Modal
            visible={!!selectedPreviewOrder}
            onDismiss={() => setSelectedPreviewOrder(null)}
            header={<Header variant="h2">Order Preview: {selectedPreviewOrder.id?.substring(0, 8)}</Header>}
            size="large"
            footer={
              <Box float="right">
                <SpaceBetween direction="horizontal" size="xs">
                  <Button onClick={() => setSelectedPreviewOrder(null)}>Close</Button>
                  <Button variant="primary" onClick={() => setShowReceipt(true)}>🧾 Generate Bill</Button>
                  <Button href={`/orders/${selectedPreviewOrder.id}`} target="_blank" iconName="external">Open Full Dashboard</Button>
                </SpaceBetween>
              </Box>
            }
          >
            <SpaceBetween size="l">
              <Container header={<Header variant="h2">Order Synopsis</Header>}>
                <ColumnLayout columns={2} variant="text-grid">
                  <div>
                    <Box variant="awsui-key-label">Retailer</Box>
                    <Box>{retailers[selectedPreviewOrder.retailer]?.name || selectedPreviewOrder.retailer}</Box>
                  </div>
                  <div>
                    <Box variant="awsui-key-label">Status</Box>
                    <Box>
                      {(() => {
                        const s = selectedPreviewOrder.status;
                        if (s === 'completed') return <StatusIndicator type="success">Completed</StatusIndicator>;
                        if (s === 'failed') return <StatusIndicator type="error">Failed</StatusIndicator>;
                        if (s === 'processing') return <StatusIndicator type="in-progress">Processing</StatusIndicator>;
                        if (s === 'requires_human') return <StatusIndicator type="warning">Requires Human</StatusIndicator>;
                        return <StatusIndicator type="pending">Pending</StatusIndicator>;
                      })()}
                    </Box>
                  </div>
                  <div>
                    <Box variant="awsui-key-label">Customer Name</Box>
                    <Box>{selectedPreviewOrder.customer_name || 'N/A'}</Box>
                  </div>
                  <div>
                    <Box variant="awsui-key-label">Customer Email</Box>
                    <Box>{selectedPreviewOrder.customer_email || 'N/A'}</Box>
                  </div>
                  <div>
                    <Box variant="awsui-key-label">Product</Box>
                    <Box>{selectedPreviewOrder.product?.name || 'N/A'}</Box>
                  </div>
                  <div>
                    <Box variant="awsui-key-label">Quantity</Box>
                    <Box>{selectedPreviewOrder.product?.quantity || 1}</Box>
                  </div>
                </ColumnLayout>
              </Container>
              {/* Sentiment / Risk Badge */}
              <Container header={<Header variant="h2">AI Insights</Header>}>
                <SpaceBetween direction="horizontal" size="s">
                  {(() => {
                    const price = selectedPreviewOrder.product?.price;
                    const name = (selectedPreviewOrder.product?.name || '').toLowerCase();
                    const badges = [];
                    if (price && price > 100) badges.push(<span key="pa" className="sentiment-badge price-alert">🔴 High Value Item</span>);
                    else if (price && price < 25) badges.push(<span key="gd" className="sentiment-badge great-deal">✅ Great Deal</span>);
                    if (name.includes('electronic') || name.includes('phone') || name.includes('laptop')) badges.push(<span key="nr" className="sentiment-badge non-refundable">⚠️ Check Return Policy</span>);
                    if (badges.length === 0) badges.push(<span key="ok" className="sentiment-badge great-deal">✅ Standard Purchase</span>);
                    return badges;
                  })()}
                </SpaceBetween>
              </Container>
              <Container header={<Header variant="h2">Delivery Information</Header>}>
                <Box>
                  {selectedPreviewOrder.shipping_address ? (
                    <>
                      <div>{selectedPreviewOrder.shipping_address.first_name} {selectedPreviewOrder.shipping_address.last_name}</div>
                      <div>{selectedPreviewOrder.shipping_address.address_line_1}</div>
                      {selectedPreviewOrder.shipping_address.address_line_2 && <div>{selectedPreviewOrder.shipping_address.address_line_2}</div>}
                      <div>{selectedPreviewOrder.shipping_address.city}, {selectedPreviewOrder.shipping_address.state} {selectedPreviewOrder.shipping_address.postal_code}</div>
                    </>
                  ) : 'N/A'}
                </Box>
              </Container>
            </SpaceBetween>
          </Modal>
        )}

        {/* Bill Receipt Modal */}
        {showReceipt && selectedPreviewOrder && (
          <Modal
            visible={showReceipt}
            onDismiss={() => setShowReceipt(false)}
            header={<Header variant="h2">Official Order Receipt</Header>}
            size="large"
            footer={
              <Box float="right">
                <SpaceBetween direction="horizontal" size="xs">
                  <Button onClick={() => setShowReceipt(false)}>Back to Preview</Button>
                  <Button onClick={() => { setSelectedPreviewOrder(null); setShowReceipt(false); }}>Close All</Button>
                  <Button variant="primary" onClick={() => window.print()} iconName="download">Print / Save PDF</Button>
                </SpaceBetween>
              </Box>
            }
          >
            <style>{`
              @media print {
                body * {
                  visibility: hidden;
                }
                .aiva-receipt-print-area, .aiva-receipt-print-area * {
                  visibility: visible;
                }
                .aiva-receipt-print-area {
                  position: absolute;
                  left: 0;
                  top: 0;
                  width: 100%;
                  padding: 20px;
                }
                .awsui-modal-dialog {
                  box-shadow: none !important;
                }
                button {
                  display: none !important;
                }
              }
            `}</style>
            <div className="aiva-receipt-print-area" style={{ padding: '20px', fontFamily: 'monospace' }}>
              <SpaceBetween size="m">
                <Box variant="h1" textAlign="center" color="text-status-success">INVOICE</Box>

                <ColumnLayout columns={2} variant="text-grid">
                  <div>
                    <Box variant="awsui-key-label">Order Number</Box>
                    <Box><strong>{selectedPreviewOrder.id}</strong></Box>
                  </div>
                  <div>
                    <Box variant="awsui-key-label">Date</Box>
                    <Box>{new Date(selectedPreviewOrder.created_at).toLocaleString()}</Box>
                  </div>
                  <div>
                    <Box variant="awsui-key-label">Billed To</Box>
                    <Box>{selectedPreviewOrder.customer_name}</Box>
                  </div>
                  <div>
                    <Box variant="awsui-key-label">Ship To</Box>
                    <Box>
                      {selectedPreviewOrder.shipping_address?.address_line_1}, {selectedPreviewOrder.shipping_address?.city}
                    </Box>
                  </div>
                </ColumnLayout>

                <div style={{ borderTop: '1px dashed #ccc', margin: '16px 0' }} />

                <ColumnLayout columns={2}>
                  <div>
                    <Box variant="awsui-key-label">Description</Box>
                    <Box variant="strong" marginTop="xs">
                      {selectedPreviewOrder.product?.quantity || 1}x {selectedPreviewOrder.product?.name}
                    </Box>
                    {selectedPreviewOrder.product?.size && <Box variant="small">Size: {selectedPreviewOrder.product.size}</Box>}
                    {selectedPreviewOrder.product?.color && <Box variant="small">Color: {selectedPreviewOrder.product.color}</Box>}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <Box variant="awsui-key-label">Amount</Box>
                    <Box variant="strong" marginTop="xs">
                      ${((selectedPreviewOrder.product?.price || Math.random() * 80 + 20) * (selectedPreviewOrder.product?.quantity || 1)).toFixed(2)}
                    </Box>
                  </div>
                </ColumnLayout>

                <div style={{ borderTop: '2px solid #333', margin: '16px 0' }} />

                <ColumnLayout columns={2}>
                  <Box variant="h3">Total Details</Box>
                  <Box variant="h3" textAlign="right">
                    Paid via {retailers[selectedPreviewOrder.retailer]?.name || selectedPreviewOrder.retailer}
                  </Box>
                </ColumnLayout>

                <Box textAlign="center" color="text-status-inactive" margin={{ top: 'xl' }}>
                  Thank you for using AIVA!
                </Box>
              </SpaceBetween>
            </div>
          </Modal>
        )}

        {/* Voice Order Assistant */}
        {showVoiceAssistant && (
          <VoiceOrderAssistant
            visible={showVoiceAssistant}
            onDismiss={() => setShowVoiceAssistant(false)}
            onOrderCreated={handleVoiceOrderCreated}
            addNotification={addNotification}
          />
        )}

        {/* Scan to Order Modal */}
        {showScanModal && (
          <Modal
            visible={showScanModal}
            onDismiss={() => { setShowScanModal(false); setScanImage(null); setScanResult(''); }}
            header={<Header variant="h2">📷 Scan to Order</Header>}
            size="medium"
            footer={
              <Box float="right">
                <SpaceBetween direction="horizontal" size="xs">
                  <Button onClick={() => { setShowScanModal(false); setScanImage(null); setScanResult(''); }}>Cancel</Button>
                  {scanResult && !scanResult.startsWith('Could not') && !scanResult.startsWith('Error') && (
                    <Button variant="primary" loading={scanLoading} onClick={async () => {
                      try {
                        setScanLoading(true);
                        const orderPayload = {
                          customer_name: 'Scan Order Customer',
                          customer_email: 'scan@aiva.demo',
                          retailer: 'amazon',
                          automation_method: 'nova_act',
                          ai_model: 'nova_act',
                          product: {
                            name: scanResult,
                            url: '',
                            quantity: 1
                          },
                          shipping_address: {
                            first_name: 'AIVA',
                            last_name: 'Scan',
                            address_line_1: '123 Demo Street',
                            city: 'Seattle',
                            state: 'WA',
                            postal_code: '98101',
                            country: 'US'
                          },
                          instructions: 'Order placed via Scan to Order AI Vision feature'
                        };
                        const resp = await fetch(`${API_BASE_URL}/api/orders`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify(orderPayload)
                        });
                        const data = await resp.json();
                        if (resp.ok) {
                          addNotification({ type: 'success', header: '📷 Scan Order Created!', content: `Order ${data.order_id} for "${scanResult}" has been added to the dashboard.` });
                        } else {
                          addNotification({ type: 'error', header: 'Order Failed', content: data.detail || 'Failed to create order' });
                        }
                      } catch (err) {
                        addNotification({ type: 'error', header: 'Order Failed', content: err.message });
                      }
                      setScanLoading(false);
                      setShowScanModal(false);
                      setScanImage(null);
                      setScanResult('');
                    }}>🚀 Order This Item</Button>
                  )}
                </SpaceBetween>
              </Box>
            }
          >
            <SpaceBetween size="l">
              <Box>Upload or capture an image of a product you'd like to order. AIVA's vision AI will identify it.</Box>
              <div
                className="scan-dropzone"
                onClick={() => document.getElementById('scan-file-input').click()}
              >
                {scanImage ? (
                  <img src={scanImage} alt="Scanned product" className="scan-preview-img" />
                ) : (
                  <div>
                    <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>📸</div>
                    <div style={{ color: '#94a3b8', fontWeight: 600 }}>Click to upload product image</div>
                    <div style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '0.5rem' }}>JPG, PNG, or WEBP up to 5MB</div>
                  </div>
                )}
                <input
                  id="scan-file-input"
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = async (ev) => {
                        const base64Data = ev.target.result;
                        setScanImage(base64Data);
                        setScanLoading(true);
                        try {
                          const apiUrl = API_BASE_URL;
                          const resp = await fetch(`${apiUrl}/api/scan-image`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ image_base64: base64Data }),
                          });
                          const data = await resp.json();
                          setScanResult(data.product || 'Could not identify product');
                        } catch (err) {
                          setScanResult('Error connecting to AI vision service: ' + err.message);
                        }
                        setScanLoading(false);
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
              </div>
              {scanLoading && (
                <Box textAlign="center">
                  <StatusIndicator type="loading">AI Vision analyzing your image...</StatusIndicator>
                </Box>
              )}
              {scanResult && (
                <Alert type="success" header="Product Identified!">
                  <strong>{scanResult}</strong> — Ready to add to your order queue.
                </Alert>
              )}
            </SpaceBetween>
          </Modal>
        )}
      </div>
    </div>
  );
};

export default OrderDashboard;
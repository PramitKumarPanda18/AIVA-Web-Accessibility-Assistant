import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { wsService } from '../services/api';
import {
  Header,
  SpaceBetween,
  Container,
  ColumnLayout,
  Box,
  StatusIndicator,
  Button,
  Table,
  Tabs,
  Alert,
  Modal,
  KeyValuePairs,
  Popover
} from '@cloudscape-design/components';
import LiveScreenshotViewer from '../components/LiveScreenshotViewer';
import LiveBrowserViewer from '../components/LiveBrowserViewer';
import SessionReplayViewer from '../components/SessionReplayViewer';

// ResizeObserver errors are handled globally by errorSuppression utility

const OrderDetails = ({ addNotification }) => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [showLiveViewer, setShowLiveViewer] = useState(false);
  // Removed showLiveBrowser - live view is now embedded
  const [showSessionReplay, setShowSessionReplay] = useState(false);
  const [autoShowLiveView, setAutoShowLiveView] = useState(false);
  const [manualControlEnabled, setManualControlEnabled] = useState(false);
  const [controlLoading, setControlLoading] = useState(false);
  const [novaActUpdates, setNovaActUpdates] = useState([]);
  const intervalRef = useRef(null);
  const logsContainerRef = useRef(null);

  const fetchOrder = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch(`/api/orders/${orderId}`);

      if (!response.ok) {
        if (response.status === 404) {
          setOrder(null);
          setLoading(false);
          return;
        }
        throw new Error('Failed to fetch order');
      }

      const orderData = await response.json();
      setOrder(orderData);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch order:', error);
      setError({
        type: 'network',
        message: error.message,
        status: error.response?.status
      });
      setLoading(false);
    }
  }, [orderId]);

  // Separate effect for auto-scrolling logs
  useEffect(() => {
    if (order?.execution_logs?.length && logsContainerRef.current) {
      setTimeout(() => {
        if (logsContainerRef.current) {
          logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
        }
      }, 100);
    }
  }, [order?.execution_logs?.length]);

  // Start polling function
  const startPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    intervalRef.current = setInterval(() => {
      fetchOrder();
    }, 30000);
  }, [fetchOrder]);

  // Stop polling function
  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    fetchOrder();

    // Set up WebSocket listeners for real-time updates
    const unsubscribeLog = wsService.subscribe('log_update', (data) => {
      if (data.order_id === orderId) {
        // Trigger a refresh to get the latest logs
        fetchOrder();
      }
    });

    const unsubscribeNovaAct = wsService.subscribe('nova_act_update', (data) => {
      if (data.order_id === orderId) {
        setNovaActUpdates(prev => [...prev, {
          ...data,
          id: Date.now() + Math.random()
        }]);

        // Also trigger a refresh for the main order data
        fetchOrder();
      }
    });

    const unsubscribeOrderUpdate = wsService.subscribe('order_updated', (data) => {
      if (data.order?.id === orderId) {
        fetchOrder();
      }
    });

    // Connect WebSocket if not already connected
    if (!wsService.ws || wsService.ws.readyState !== WebSocket.OPEN) {
      wsService.connect();
    }

    return () => {
      stopPolling();
      unsubscribeLog();
      unsubscribeNovaAct();
      unsubscribeOrderUpdate();
    };
  }, [orderId]); // Only depend on orderId to prevent re-subscription loops

  // Handle polling based on order status
  useEffect(() => {
    if (order?.status) {
      if (['pending', 'processing'].includes(order.status)) {
        console.log(`Starting polling for order ${order?.id} with status: ${order.status}`);
        startPolling();

        // Auto-show live view for processing orders (embedded, no modals)
        if (order.status === 'processing' && !autoShowLiveView) {
          setAutoShowLiveView(true);
          // Live view is now embedded in page, no need to auto-show modals
          console.log('Order is processing, live view will be embedded in page');
        }
      } else {
        console.log(`Stopping polling for order ${order?.id} with final status: ${order.status}`);
        stopPolling();
        setAutoShowLiveView(false);
      }
    }
    return () => stopPolling();
  }, [order?.id, order?.status, startPolling, stopPolling, autoShowLiveView, order?.screenshots]);

  const handleCancelOrder = async () => {
    try {
      const response = await fetch(`/api/orders/${orderId}/cancel`, { method: 'POST' });

      if (!response.ok) {
        throw new Error('Failed to cancel order');
      }

      addNotification({
        type: 'success',
        header: 'Order Cancelled',
        content: 'Order has been cancelled successfully'
      });
      fetchOrder();
    } catch (error) {
      addNotification({
        type: 'error',
        header: 'Failed to cancel order',
        content: error.message
      });
    } finally {
      setShowCancelModal(false);
    }
  };

  const handleTakeControl = async () => {
    setControlLoading(true);
    try {
      const response = await fetch(`/api/orders/${orderId}/take-control`, { method: 'POST' });

      if (!response.ok) {
        throw new Error('Failed to take manual control');
      }

      const result = await response.json();
      if (result.success) {
        setManualControlEnabled(true);
        addNotification({
          type: 'success',
          header: 'Manual Control Enabled',
          content: 'You can now interact with the browser directly'
        });
      } else {
        throw new Error(result.error || 'Failed to enable manual control');
      }
    } catch (error) {
      addNotification({
        type: 'error',
        header: 'Failed to take control',
        content: error.message
      });
    } finally {
      setControlLoading(false);
    }
  };

  const handleReleaseControl = async () => {
    setControlLoading(true);
    try {
      const response = await fetch(`/api/orders/${orderId}/release-control`, { method: 'POST' });

      if (!response.ok) {
        throw new Error('Failed to release manual control');
      }

      const result = await response.json();
      if (result.success) {
        setManualControlEnabled(false);
        addNotification({
          type: 'success',
          header: 'Manual Control Released',
          content: 'Automation has been restored'
        });
      } else {
        throw new Error(result.error || 'Failed to release manual control');
      }
    } catch (error) {
      addNotification({
        type: 'error',
        header: 'Failed to release control',
        content: error.message
      });
    } finally {
      setControlLoading(false);
    }
  };

  const handleResumeNovaAct = async () => {
    setControlLoading(true);
    try {
      const response = await fetch(`/api/orders/${orderId}/resume-nova-act`, { method: 'POST' });

      if (!response.ok) {
        throw new Error('Failed to resume Nova Act');
      }

      const result = await response.json();
      if (result.success) {
        addNotification({
          type: 'success',
          header: 'Nova Act Resumed',
          content: 'Nova Act automation has been resumed successfully'
        });
        fetchOrder(); // Refresh order data
      } else {
        addNotification({
          type: 'warning',
          header: 'Nova Act Resume Result',
          content: result.message || 'Nova Act resumed but may require further attention'
        });
        fetchOrder(); // Refresh order data
      }
    } catch (error) {
      addNotification({
        type: 'error',
        header: 'Failed to resume Nova Act',
        content: error.message
      });
    } finally {
      setControlLoading(false);
    }
  };

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

  const calculateDuration = (createdAt, completedAt) => {
    if (!createdAt || !completedAt) return 'N/A';
    const startTime = new Date(createdAt);
    const endTime = new Date(completedAt);
    const durationMs = endTime - startTime;

    if (durationMs < 0) return 'N/A';

    if (durationMs < 1000) {
      return `${durationMs}ms`;
    }

    const seconds = Math.floor(durationMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
    if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    if (seconds > 0) return `${seconds}s`;
    return `${durationMs}ms`;
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
        case 'cancelled':
          return <StatusIndicator type="stopped">Cancelled</StatusIndicator>;
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

  const renderOverviewTab = () => {
    if (!order) return null;

    return (
      <SpaceBetween size="m">
        <Container header={<Header variant="h3">Order Information</Header>}>
          <ColumnLayout columns={3}>
            <KeyValuePairs
              columns={1}
              items={[
                { label: 'Order ID', value: order?.id || 'N/A' },
                { label: 'Status', value: getStatusIndicator(order.status, order.status_tooltip) },
                { label: 'Retailer', value: order.retailer || 'N/A' },
                { label: 'Automation Method', value: order.automation_method_display || order.automation_method || 'N/A' },
                {
                  label: 'AI Model',
                  value: order?.ai_model ? (
                    <span title={order.ai_model}>
                      {order.ai_model.includes('claude-sonnet-4') ? 'Claude Sonnet 4' :
                        order.ai_model.includes('claude-3-5-sonnet') ? 'Claude 3.5 Sonnet' :
                          order.ai_model.includes('claude-sonnet') ? 'Claude 3.5 Sonnet' :
                            order.ai_model.includes('claude-haiku') ? 'Claude 3.5 Haiku' :
                              order.ai_model.includes('claude-opus') ? 'Claude 3 Opus' :
                                order.ai_model.includes('gpt-4') ? 'GPT-4' :
                                  order.ai_model.includes('gpt-3.5') ? 'GPT-3.5' :
                                    order.ai_model.length > 50 ? `${order.ai_model.substring(0, 30)}...` :
                                      order.ai_model}
                    </span>
                  ) : 'System Default'
                }
              ]}
            />
            <KeyValuePairs
              columns={1}
              items={[
                { label: 'Product Name', value: order.product?.name || 'N/A' },
                { label: 'Size', value: (order.product?.size && order.product.size !== '-') ? order.product.size : 'N/A' },
                { label: 'Color', value: (order.product?.color && order.product.color !== '-') ? order.product.color : 'N/A' },
                { label: 'Quantity', value: order.product?.quantity || 'N/A' }
              ]}
            />
            <KeyValuePairs
              columns={1}
              items={[
                { label: 'Created', value: formatTime(order.created_at) },
                { label: 'Updated', value: formatTime(order.updated_at) },
                { label: 'Completed', value: formatTime(order.completed_at) },
                { label: 'Duration', value: calculateDuration(order.created_at, order.completed_at) }
              ]}
            />
          </ColumnLayout>
        </Container>

        {/* Execution Logs - CloudWatch Style */}
        <Container
          header={
            <Header
              variant="h3"
              counter={`(${(order.execution_logs || []).length})`}
              description="Real-time automation agent logs"
            >
              Execution Logs
            </Header>
          }
          fitHeight
        >
          <div
            ref={logsContainerRef}
            style={{
              height: '400px',
              overflowY: 'auto',
              padding: '0',
              backgroundColor: '#232f3e',
              fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
              fontSize: '13px',
              lineHeight: '1.4'
            }}
            role="region"
            aria-label="Execution logs"
          >
            {(order.execution_logs || []).length === 0 ? (
              <div style={{
                padding: '20px',
                textAlign: 'center',
                color: '#879196'
              }}>
                <div>No execution logs yet</div>
                <div style={{ fontSize: '12px', marginTop: '8px' }}>
                  Logs will appear here as the automation agent processes your order
                </div>
              </div>
            ) : (
              <div>
                {order.execution_logs.map((log, index) => {
                  const timestamp = new Date(log.timestamp).toISOString();
                  const logLevel = log.level || 'INFO';
                  const logColor = logLevel === 'ERROR' ? '#ff6b6b' :
                    logLevel === 'WARNING' ? '#ffa726' : '#e8eaed';

                  return (
                    <div
                      key={index}
                      style={{
                        padding: '4px 12px',
                        borderBottom: '1px solid #3c4043',
                        color: logColor,
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word'
                      }}
                    >
                      <span style={{ color: '#9aa0a6' }}>{timestamp}</span>
                      <span style={{ color: '#8ab4f8', marginLeft: '12px' }}>[{logLevel}]</span>
                      <span style={{ marginLeft: '12px' }}>{log.message}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Container>

        {/* Nova Act Real-time Updates */}
        {order.automation_method === 'nova_act' && novaActUpdates.length > 0 && (
          <Container
            header={
              <Header
                variant="h3"
                counter={`(${novaActUpdates.length})`}
                description="Real-time Nova Act automation updates"
              >
                Nova Act Live Updates
              </Header>
            }
          >
            <div style={{
              maxHeight: '300px',
              overflowY: 'auto',
              padding: '0',
              backgroundColor: '#f8f9fa',
              border: '1px solid #e9ecef',
              borderRadius: '4px'
            }}>
              {novaActUpdates.slice(-10).map((update) => {
                const timestamp = new Date(update.timestamp).toLocaleTimeString();
                const getUpdateColor = (type) => {
                  switch (type) {
                    case 'error_occurred': return '#dc3545';
                    case 'agent_thinking': return '#6f42c1';
                    case 'action_performed': return '#28a745';
                    case 'command_started': return '#007bff';
                    case 'report_available': return '#17a2b8';
                    default: return '#6c757d';
                  }
                };

                return (
                  <div
                    key={update.id}
                    style={{
                      padding: '8px 12px',
                      borderBottom: '1px solid #e9ecef',
                      fontSize: '13px'
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginBottom: '4px'
                    }}>
                      <span style={{
                        color: '#6c757d',
                        fontSize: '12px'
                      }}>
                        {timestamp}
                      </span>
                      <span style={{
                        color: getUpdateColor(update.update_type),
                        fontWeight: 'bold',
                        fontSize: '12px'
                      }}>
                        {update.update_type.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                    <div style={{
                      color: '#495057',
                      marginLeft: '16px'
                    }}>
                      {update.data.thought && `Thought: ${update.data.thought}`}
                      {update.data.action && `Action: ${update.data.action}`}
                      {update.data.command && `Command: ${update.data.command}`}
                      {update.data.error && `Error: ${update.data.error}`}
                      {update.data.html_path && `Report available (${update.data.total_steps} steps)`}
                    </div>
                  </div>
                );
              })}
            </div>
          </Container>
        )}

        {(order.customer_name || order.shipping_address) && (
          <Container header={<Header variant="h3">Customer & Shipping</Header>}>
            <ColumnLayout columns={2}>
              {order.customer_name && (
                <KeyValuePairs
                  columns={1}
                  items={[
                    { label: 'Customer Name', value: order.customer_name },
                    { label: 'Email', value: order.customer_email || 'N/A' }
                  ]}
                />
              )}
              {order.shipping_address && (
                <Box>
                  <Box variant="awsui-key-label">Shipping Address</Box>
                  <Box>
                    {order.shipping_address.first_name} {order.shipping_address.last_name}<br />
                    {order.shipping_address.address_line_1}<br />
                    {order.shipping_address.address_line_2 && (
                      <>{order.shipping_address.address_line_2}<br /></>
                    )}
                    {order.shipping_address.city}, {order.shipping_address.state} {order.shipping_address.postal_code}<br />
                    {order.shipping_address.country}
                  </Box>
                </Box>
              )}
            </ColumnLayout>
          </Container>
        )}
      </SpaceBetween>
    );
  };

  const renderExecutionLogsTab = () => {
    const logs = order?.execution_logs || [];

    return (
      <Table
        columnDefinitions={[
          {
            id: 'timestamp',
            header: 'Timestamp',
            cell: item => formatTime(item.timestamp),
            sortingField: 'timestamp'
          },
          {
            id: 'level',
            header: 'Level',
            cell: item => (
              <StatusIndicator
                type={item.level === 'ERROR' ? 'error' :
                  item.level === 'WARNING' ? 'warning' :
                    item.level === 'INFO' ? 'info' : 'success'}
              >
                {item.level}
              </StatusIndicator>
            )
          },
          {
            id: 'message',
            header: 'Message',
            cell: item => item.message
          },
          {
            id: 'step',
            header: 'Step',
            cell: item => item.step || 'N/A'
          }
        ]}
        items={logs}
        sortingDisabled={false}
        empty={
          <Box textAlign="center" color="inherit">
            <b>No execution logs available</b>
          </Box>
        }
        header={
          <Header
            counter={`(${logs.length})`}
            description="Detailed execution logs from the automation agent"
            actions={
              <SpaceBetween direction="horizontal" size="xs">
                {/* TEMPORARILY DISABLED - Screenshots Button - Will be re-enabled later */}
                {/* 
                {(order?.screenshots?.length > 0) && (
                  <Button
                    iconName="camera"
                    onClick={() => setShowLiveViewer(true)}
                  >
                    Screenshots
                  </Button>
                )}
                */}
                {/* END TEMPORARILY DISABLED - Screenshots Button */}

                <Button
                  iconName="play"
                  onClick={() => setShowSessionReplay(true)}
                >
                  Session Replay
                </Button>
              </SpaceBetween>
            }
          >
            Execution Logs
          </Header>
        }
      />
    );
  };



  if (loading) {
    return (
      <div className="stagger-1" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div className="aiva-card" style={{ padding: '4rem', textAlign: 'center' }}>
          <span className="material-icons rotating" style={{ fontSize: '48px', color: 'var(--primary-color)', marginBottom: '1.5rem' }}>sync</span>
          <h2 className="stylish-title">Synchronizing Mission Data</h2>
          <p style={{ color: '#94a3b8' }}>Please wait while we establish a secure uplink to the automation agent.</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="stagger-1">
        <div className="aiva-card" style={{ padding: '4rem', textAlign: 'center' }}>
          <span className="material-icons" style={{ fontSize: '48px', color: '#fb7185', marginBottom: '1.5rem' }}>error_outline</span>
          <h2 className="stylish-title">{error ? 'Uplink Failed' : 'Mission Not Found'}</h2>
          <p style={{ color: '#94a3b8', marginBottom: '2rem' }}>{error?.message || 'The requested mission parameters do not exist in the vault.'}</p>
          <button className="btn-stylish" onClick={() => navigate('/dashboard')}>RETURN TO COMMAND CENTER</button>
        </div>
      </div>
    );
  }

  return (
    <div className="stagger-1">
      {/* Premium Mission Header */}
      <div className="aiva-card" style={{ marginBottom: '2.5rem', padding: '3rem', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'relative', zIndex: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1rem' }}>
              <span className="material-icons" style={{ color: 'var(--primary-color)' }}>assignment</span>
              <span style={{ color: '#94a3b8', fontWeight: 600, letterSpacing: '0.1em' }}>MISSION INTEL: {order.id}</span>
            </div>
            <h1 className="stylish-title" style={{ marginBottom: '1rem' }}>{order.product?.name || 'Tactical Procurement'}</h1>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              {getStatusIndicator(order.status)}
              <span style={{ color: '#475569' }}>|</span>
              <span style={{ color: '#94a3b8' }}>Retailer: <strong style={{ color: 'white' }}>{order.retailer}</strong></span>
              <span style={{ color: '#475569' }}>|</span>
              <span style={{ color: '#94a3b8' }}>Created: <strong style={{ color: 'white' }}>{formatTime(order.created_at)}</strong></span>
            </div>
          </div>

          <SpaceBetween direction="horizontal" size="s">
            <button className="btn-stylish" style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)' }} onClick={fetchOrder}>
              <span className={`material-icons ${loading ? 'rotating' : ''}`} style={{ fontSize: '18px', marginRight: '8px' }}>refresh</span>
              REFRESH
            </button>

            {(order.status === 'processing' || order.status === 'pending' || order.status === 'requires_human') && (
              <button className="btn-stylish" style={{ background: 'rgba(244, 63, 94, 0.1)', color: '#fb7185' }} onClick={() => setShowCancelModal(true)}>
                <span className="material-icons" style={{ marginRight: '8px' }}>cancel</span>
                TERMINATE
              </button>
            )}

            {order.status === 'processing' && order.automation_method === 'strands' && (
              !manualControlEnabled ? (
                <button className="btn-stylish" onClick={handleTakeControl} disabled={controlLoading}>
                  <span className="material-icons" style={{ marginRight: '8px' }}>videogame_asset</span>
                  TAKE CONTROL
                </button>
              ) : (
                <button className="btn-stylish" style={{ background: 'var(--primary-color)' }} onClick={handleReleaseControl} disabled={controlLoading}>
                  <span className="material-icons" style={{ marginRight: '8px' }}>play_arrow</span>
                  RELEASE TO AI
                </button>
              )
            )}

            {(order.status === 'failed' || order.status === 'requires_human') && order.automation_method === 'nova_act' && (
              <button className="btn-stylish" onClick={handleResumeNovaAct} disabled={controlLoading}>
                <span className="material-icons" style={{ marginRight: '8px' }}>play_circle</span>
                RESUME MISSION
              </button>
            )}
          </SpaceBetween>
        </div>

        {/* Background Glow */}
        <div style={{
          position: 'absolute',
          top: '-50px',
          right: '-50px',
          width: '300px',
          height: '300px',
          background: `radial-gradient(circle, ${order.status === 'completed' ? 'rgba(16, 185, 129, 0.1)' : order.status === 'failed' ? 'rgba(244, 63, 94, 0.1)' : 'rgba(99, 102, 241, 0.1)'} 0%, transparent 70%)`,
          borderRadius: '50%'
        }}></div>
      </div>

      <div className="aiva-form-grid">
        {/* Console Column */}
        <div style={{ gridColumn: 'span 2' }}>
          <div className="aiva-card stagger-2" style={{ padding: '1.5rem', minHeight: '600px', display: 'flex', flexDirection: 'column' }}>
            <Tabs
              activeTabId={activeTab}
              onChange={({ detail }) => setActiveTab(detail.activeTabId)}
              tabs={[
                {
                  id: 'overview',
                  label: 'Tactical Console',
                  content: (
                    <div style={{ marginTop: '2rem' }}>
                      <div style={{
                        background: 'rgba(2, 6, 23, 0.6)',
                        borderRadius: '16px',
                        padding: '1.5rem',
                        border: '1px solid var(--glass-border)',
                        marginBottom: '2rem'
                      }}>
                        <h4 style={{ color: '#6366f1', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '1.5rem', letterSpacing: '0.1em' }}>Live Mission Stream</h4>
                        {order.status === 'processing' ? (
                          <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <LiveBrowserViewer orderId={orderId} />
                          </div>
                        ) : order.status === 'completed' || order.status === 'failed' ? (
                          <div style={{ position: 'relative' }}>
                            <div style={{ height: '400px', background: 'rgba(0,0,0,0.3)', borderRadius: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                              <button className="btn-stylish" onClick={() => setShowSessionReplay(true)}>
                                <span className="material-icons" style={{ marginRight: '8px' }}>replay</span>
                                WATCH MISSION REPLAY
                              </button>
                            </div>
                          </div>
                        ) : (
                          <Box textAlign="center" padding="xxl" color="text-body-secondary">
                            Waiting for agent initialization...
                          </Box>
                        )}
                      </div>

                      {/* Execution Terminal */}
                      <div style={{
                        background: '#0f172a',
                        borderRadius: '16px',
                        padding: '0',
                        border: '1px solid rgba(255,255,255,0.1)',
                        overflow: 'hidden'
                      }}>
                        <div style={{ padding: '1rem 1.5rem', background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ color: '#94a3b8', fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.1em' }}>TERMINAL_LOGS_STREAM</span>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ff5f56' }}></div>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ffbd2e' }}></div>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#27c93f' }}></div>
                          </div>
                        </div>
                        <div
                          ref={logsContainerRef}
                          style={{
                            height: '350px',
                            overflowY: 'auto',
                            padding: '1.5rem',
                            fontFamily: '"JetBrains Mono", "Fira Code", monospace',
                            fontSize: '13px',
                            lineHeight: '1.6'
                          }}
                        >
                          {(order.execution_logs || []).map((log, index) => (
                            <div key={index} style={{ marginBottom: '6px', color: log.level === 'ERROR' ? '#fb7185' : log.level === 'WARNING' ? '#fbbf24' : '#e2e8f0' }}>
                              <span style={{ color: '#475569', marginRight: '1rem' }}>[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                              <span style={{ color: log.level === 'ERROR' ? '#fb7185' : '#6366f1', fontWeight: 700, marginRight: '1rem' }}>{log.level}</span>
                              <span>{log.message}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )
                },
                {
                  id: 'visuals',
                  label: 'Intel Captures',
                  content: (
                    <div style={{ marginTop: '2rem' }}>
                      <LiveScreenshotViewer
                        orderId={orderId}
                        screenshots={order.screenshots || []}
                      />
                    </div>
                  )
                }
              ]}
            />
          </div>
        </div>

        {/* Info Column */}
        <div style={{ gridColumn: 'span 1' }}>
          <div className="aiva-card stagger-3" style={{ padding: '2rem' }}>
            <h4 style={{ color: '#6366f1', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '1.5rem', letterSpacing: '0.1em' }}>Mission Metadata</h4>

            <SpaceBetween size="xl">
              <div className="aiva-field-group">
                <label className="aiva-field-label">Target Commodity</label>
                <div style={{ fontSize: '1.1rem', color: 'white', fontWeight: 600 }}>{order.product?.name}</div>
                <div style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: '4px' }}>
                  {order.product?.color} / {order.product?.size}
                </div>
              </div>

              <div className="aiva-field-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <div className="aiva-field-group">
                  <label className="aiva-field-label">Quantity</label>
                  <div style={{ color: 'white', fontWeight: 600 }}>{order.product?.quantity || 1} UNIT(S)</div>
                </div>
                <div className="aiva-field-group">
                  <label className="aiva-field-label">Budget Impact</label>
                  <div style={{ color: '#10b981', fontWeight: 700 }}>${order.product?.price || '0.00'}</div>
                </div>
              </div>

              <div className="aiva-field-group">
                <label className="aiva-field-label">Deployment Status</label>
                <div style={{ padding: '0.8rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Operation Pulse:</span>
                    <span style={{ color: 'white', fontWeight: 600 }}>{order.status.toUpperCase()}</span>
                  </div>
                  <div style={{ height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: order.status === 'completed' ? '100%' : order.status === 'failed' ? '100%' : '65%',
                      background: order.status === 'failed' ? '#fb7185' : 'var(--primary-color)',
                      boxShadow: '0 0 10px var(--primary-color)'
                    }}></div>
                  </div>
                </div>
              </div>

              <div className="aiva-field-group">
                <label className="aiva-field-label">Logistics Data</label>
                {order.shipping_address ? (
                  <div style={{ color: '#94a3b8', fontSize: '0.9rem', lineHeight: '1.6' }}>
                    <strong style={{ color: 'white' }}>{order.shipping_address.first_name} {order.shipping_address.last_name}</strong><br />
                    {order.shipping_address.address_line_1}<br />
                    {order.shipping_address.city}, {order.shipping_address.state} {order.shipping_address.postal_code}
                  </div>
                ) : (
                  <div style={{ color: '#475569' }}>NO LOGISTICS DATA PROVIDED</div>
                )}
              </div>
            </SpaceBetween>
          </div>
        </div>
      </div>

      {/* Modals remain mostly the same but could use simple restyling if needed */}
      <Modal
        visible={showCancelModal}
        onDismiss={() => setShowCancelModal(false)}
        header="Terminate Mission"
        footer={
          <Box float="right">
            <SpaceBetween direction="horizontal" size="xs">
              <Button onClick={() => setShowCancelModal(false)}>Abort Disconnect</Button>
              <Button variant="primary" onClick={handleCancelOrder}>Confirm Termination</Button>
            </SpaceBetween>
          </Box>
        }
      >
        Immediate termination will disconnect the automation agent. Any ongoing transaction may be left in an incomplete state.
      </Modal>

      {showSessionReplay && (
        <SessionReplayViewer
          orderId={orderId}
          visible={showSessionReplay}
          onDismiss={() => setShowSessionReplay(false)}
        />
      )}
    </div>
  );
};

export default OrderDetails;
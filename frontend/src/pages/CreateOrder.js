import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Header,
  SpaceBetween,
  Button,
  FormField,
  Input,
  Select,
  Textarea,
  ColumnLayout,
  Box,
  ExpandableSection
} from '@cloudscape-design/components';
import ModelSelector from '../components/ModelSelector';

const CreateOrder = ({ addNotification }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [retailerUrls, setRetailerUrls] = useState([]);
  const [loadingRetailers, setLoadingRetailers] = useState(true);
  const [secrets, setSecrets] = useState([]);
  const [formData, setFormData] = useState({
    // Required fields - minimal for demo
    retailer: '', // User will type retailer name
    product_url: '', // No default URL
    product_name: '',

    // Optional fields - demo mode
    customer_name: 'Demo Customer',
    customer_email: 'demo@example.com',
    shipping_first_name: 'Demo',
    shipping_last_name: 'User',
    shipping_address_1: '123 Demo Street',
    shipping_city: 'Demo City',
    shipping_state: 'CA',
    shipping_postal_code: '12345',
    shipping_country: 'US',

    // Agent will figure these out
    product_size: '',
    product_color: '',
    product_quantity: 1,
    product_price: '',
    shipping_address_2: '',
    automation_method: 'nova_act', // Default to Nova Act + AgentCore Browser
    ai_model: 'nova_act',

    // Instructions for agent (optional)
    instructions: ''
  });

  const [userSelectedModel, setUserSelectedModel] = useState(false);

  const fetchRetailerUrls = useCallback(async () => {
    try {
      setLoadingRetailers(true);
      const response = await fetch('/api/config/retailer-urls');
      if (response.ok) {
        const data = await response.json();
        setRetailerUrls(data.retailer_urls || []);
      }
    } catch (error) {
      console.error('Failed to fetch retailer URLs:', error);
      addNotification({
        type: 'error',
        header: 'Failed to load retailers',
        content: error.message
      });
    } finally {
      setLoadingRetailers(false);
    }
  }, [addNotification]);

  const fetchSecrets = useCallback(async () => {
    try {
      const response = await fetch('/api/secrets');
      if (response.ok) {
        const data = await response.json();
        setSecrets(data.secrets || []);
      } else {
        console.warn('Failed to fetch secrets, using empty array');
        setSecrets([]);
      }
    } catch (error) {
      console.error('Failed to fetch secrets:', error);
      setSecrets([]); // Set empty array on error
    }
  }, []);

  useEffect(() => {
    fetchRetailerUrls();
    fetchSecrets();
  }, [fetchRetailerUrls, fetchSecrets]);

  const handleInputChange = (field, value) => {
    setFormData(prev => {
      const newData = {
        ...prev,
        [field]: value
      };

      // When automation method changes to nova_act, set AI model to Nova Act
      if (field === 'automation_method' && value === 'nova_act') {
        newData.ai_model = 'nova_act';
        setUserSelectedModel(false); // Reset user selection tracking
      }
      // When automation method changes from nova_act to strands, set default only if user hasn't selected
      else if (field === 'automation_method' && value === 'strands' && prev.automation_method === 'nova_act' && !userSelectedModel) {
        newData.ai_model = 'us.anthropic.claude-sonnet-4-20250514-v1:0';
      }

      return newData;
    });
  };

  const validateForm = () => {
    return formData.retailer && formData.product_name;
  };

  const hasCredentialsForRetailer = (retailerName) => {
    if (!retailerName || !secrets.length) return false;

    // Check for exact name match
    const exactMatch = secrets.find(secret =>
      secret.site_name.toLowerCase() === retailerName.toLowerCase()
    );
    if (exactMatch) return true;

    // Check for partial name match
    const partialMatch = secrets.find(secret =>
      secret.site_name.toLowerCase().includes(retailerName.toLowerCase()) ||
      retailerName.toLowerCase().includes(secret.site_name.toLowerCase())
    );
    return !!partialMatch;
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const orderData = {
        customer_name: formData.customer_name,
        customer_email: formData.customer_email,
        retailer: formData.retailer,
        automation_method: formData.automation_method,
        ai_model: formData.ai_model,
        product: {
          url: formData.product_url,
          name: formData.product_name,
          size: formData.product_size || undefined,
          color: formData.product_color || undefined,
          quantity: formData.product_quantity,
          price: formData.product_price ? parseFloat(formData.product_price) : undefined
        },
        shipping_address: {
          first_name: formData.shipping_first_name,
          last_name: formData.shipping_last_name,
          address_line_1: formData.shipping_address_1,
          address_line_2: formData.shipping_address_2 || undefined,
          city: formData.shipping_city,
          state: formData.shipping_state,
          postal_code: formData.shipping_postal_code,
          country: formData.shipping_country
        },

        instructions: formData.instructions || undefined
      };

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      });

      if (!response.ok) {
        throw new Error('Failed to create order');
      }

      const result = await response.json();

      addNotification({
        type: 'success',
        header: 'Order Created',
        content: `Order ${result.order_id} has been created successfully`
      });

      navigate('/dashboard');

    } catch (error) {
      addNotification({
        type: 'error',
        header: 'Order Creation Failed',
        content: `Failed to create order: ${error.message}`
      });
    } finally {
      setLoading(false);
    }
  };

  // Get unique retailers for dropdown
  const getRetailerOptions = () => {
    const uniqueRetailers = {};
    retailerUrls.forEach(url => {
      if (!uniqueRetailers[url.retailer]) {
        uniqueRetailers[url.retailer] = {
          label: url.retailer.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          value: url.retailer
        };
      }
    });
    return Object.values(uniqueRetailers);
  };

  // Get default URL for selected retailer
  const getDefaultUrlForRetailer = (retailer) => {
    const defaultUrl = retailerUrls.find(url => url.retailer === retailer && url.is_default);
    return defaultUrl ? defaultUrl.starting_url : '';
  };

  // Handle retailer change
  const handleRetailerChange = (retailer) => {
    handleInputChange('retailer', retailer);
    // Always update product URL with default URL for selected retailer
    const defaultUrl = getDefaultUrlForRetailer(retailer);
    if (defaultUrl) {
      handleInputChange('product_url', defaultUrl);
    }
  };



  return (
    <div className="stagger-1">
      {/* Dynamic Header Section */}
      <div className="aiva-card" style={{ marginBottom: '3rem', padding: '3rem', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'relative', zIndex: 2 }}>
          <h1 className="stylish-title" style={{ marginBottom: '1rem' }}>Create New Order</h1>
          <p style={{
            color: '#94a3b8',
            fontSize: '1.2rem',
            maxWidth: '900px',
            lineHeight: '1.6',
            marginBottom: '2rem'
          }}>
            Configure your AI-powered accessibility agent. AIVA will handle the complexity of navigating, selecting, and purchasing products based on your preferences.
          </p>

          <Button
            iconName="arrow-left"
            onClick={() => navigate('/dashboard')}
          >
            Return to Dashboard
          </Button>
        </div>

        {/* Subtle decorative glow */}
        <div style={{
          position: 'absolute',
          top: '-50px',
          right: '-50px',
          width: '300px',
          height: '300px',
          background: 'radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, transparent 70%)',
          borderRadius: '50%'
        }}></div>
      </div>

      {/* Radical Form Grid */}
      <div className="aiva-form-grid">

        {/* Section 1: Core Configuration */}
        <div className="aiva-form-section stagger-2">
          <div className="section-title">
            <div className="section-icon">
              <span className="material-icons">settings_suggest</span>
            </div>
            Core Setup
          </div>

          <div className="aiva-field-group">
            <label className="aiva-field-label">Retailer</label>
            <div className="aiva-field-desc">Select the store where AIVA will begin its search.</div>
            <div className="aiva-input-wrapper">
              <Select
                selectedOption={getRetailerOptions().find(opt => opt.value === formData.retailer) || null}
                onChange={({ detail }) => handleRetailerChange(detail.selectedOption.value)}
                options={getRetailerOptions()}
                placeholder={loadingRetailers ? "Loading retailers..." : "Select retailer"}
                disabled={loadingRetailers}
              />
            </div>
            {formData.retailer && (
              <div style={{ marginTop: '0.5rem' }}>
                {hasCredentialsForRetailer(formData.retailer) ? (
                  <Box color="text-status-success" fontSize="body-s">
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span className="material-icons" style={{ fontSize: '14px' }}>check_circle</span>
                      Credentials active
                    </span>
                  </Box>
                ) : (
                  <Box color="text-status-warning" fontSize="body-s">
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span className="material-icons" style={{ fontSize: '14px' }}>warning</span>
                      No credentials found
                    </span>
                  </Box>
                )}
              </div>
            )}
          </div>

          <div className="aiva-field-group">
            <label className="aiva-field-label">Automation Intelligence</label>
            <div className="aiva-field-desc">Choose the brain power for this mission.</div>
            <div className="aiva-input-wrapper">
              <Select
                selectedOption={
                  formData.automation_method === 'nova_act'
                    ? { label: 'Nova Act (Natural Language)', value: 'nova_act' }
                    : { label: 'Strands (Advanced Tools)', value: 'strands' }
                }
                onChange={({ detail }) => handleInputChange('automation_method', detail.selectedOption.value)}
                options={[
                  { label: 'Nova Act (Natural Language)', value: 'nova_act' },
                  { label: 'Strands (Advanced Tools)', value: 'strands' }
                ]}
              />
            </div>
          </div>

          <div className="aiva-field-group">
            <label className="aiva-field-label">AI Model</label>
            <div className="aiva-input-wrapper">
              <ModelSelector
                selectedModel={formData.ai_model}
                onChange={(model) => {
                  handleInputChange('ai_model', model);
                  setUserSelectedModel(true);
                }}
                disabled={formData.automation_method === 'nova_act'}
              />
            </div>
          </div>
        </div>

        {/* Section 2: Product Discovery */}
        <div className="aiva-form-section stagger-3">
          <div className="section-title">
            <div className="section-icon">
              <span className="material-icons">shopping_cart</span>
            </div>
            Product Discovery
          </div>

          <div className="aiva-field-group">
            <label className="aiva-field-label">What are we looking for?</label>
            <div className="aiva-field-desc">Provide a name or brief description.</div>
            <div className="aiva-input-wrapper">
              <Input
                value={formData.product_name}
                onChange={({ detail }) => handleInputChange('product_name', detail.value)}
                placeholder="e.g. Blue Denim Jacket"
              />
            </div>
          </div>

          <div className="aiva-field-group">
            <label className="aiva-field-label">Start URL (Optional)</label>
            <div className="aiva-field-desc">Direct landing page for AIVA.</div>
            <div className="aiva-input-wrapper">
              <Input
                value={formData.product_url}
                onChange={({ detail }) => handleInputChange('product_url', detail.value)}
                placeholder="https://..."
              />
            </div>
          </div>

          <div className="aiva-form-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: 0 }}>
            <div className="aiva-field-group">
              <label className="aiva-field-label">Size</label>
              <div className="aiva-input-wrapper">
                <Input
                  value={formData.product_size}
                  onChange={({ detail }) => handleInputChange('product_size', detail.value)}
                  placeholder="Auto"
                />
              </div>
            </div>
            <div className="aiva-field-group">
              <label className="aiva-field-label">Color</label>
              <div className="aiva-input-wrapper">
                <Input
                  value={formData.product_color}
                  onChange={({ detail }) => handleInputChange('product_color', detail.value)}
                  placeholder="Auto"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Fulfillment & Instructions */}
        <div className="aiva-form-section stagger-4">
          <div className="section-title">
            <div className="section-icon">
              <span className="material-icons">assignment</span>
            </div>
            Final Instructions
          </div>

          <div className="aiva-field-group">
            <label className="aiva-field-label">Quantity</label>
            <div className="aiva-input-wrapper">
              <Input
                value={formData.product_quantity.toString()}
                onChange={({ detail }) => handleInputChange('product_quantity', parseInt(detail.value) || 1)}
                type="number"
              />
            </div>
          </div>

          <div className="aiva-field-group">
            <label className="aiva-field-label">Special Directives</label>
            <div className="aiva-field-desc">Any extra rules for AIVA to follow?</div>
            <div className="aiva-input-wrapper" style={{ padding: '8px' }}>
              <Textarea
                value={formData.instructions}
                onChange={({ detail }) => handleInputChange('instructions', detail.value)}
                placeholder="e.g. 'Use fastest shipping' or 'Only buy if price is below $50'"
                rows={5}
              />
            </div>
          </div>

          <div style={{ marginTop: '2rem' }}>
            <button
              className="btn-stylish"
              style={{
                width: '100%',
                padding: '1.2rem',
                fontSize: '1.1rem',
                justifyContent: 'center',
                background: validateForm() ? 'linear-gradient(135deg, #6366f1, #ec4899)' : 'rgba(255,255,255,0.05)',
                color: validateForm() ? 'white' : '#475569',
                cursor: validateForm() ? 'pointer' : 'not-allowed',
                boxShadow: validateForm() ? '0 10px 20px rgba(99, 102, 241, 0.3)' : 'none',
                opacity: loading ? 0.7 : 1
              }}
              onClick={handleSubmit}
              disabled={!validateForm() || loading}
            >
              {loading ? (
                <>
                  <span className="material-icons rotating" style={{ fontSize: '20px', marginRight: '8px' }}>sync</span>
                  INITIALIZING AGENT...
                </>
              ) : (
                <>
                  <span className="material-icons" style={{ fontSize: '20px', marginRight: '8px' }}>rocket_launch</span>
                  LAUNCH AIVA MISSION
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Styles for rotating icon */}
      <style>{`
        @keyframes rotating {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .rotating {
          animation: rotating 2s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default CreateOrder;
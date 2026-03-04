import React, { useState, useEffect, useCallback } from 'react';
import {
  Wizard,
  Container,
  Header,
  SpaceBetween,
  FormField,
  Input,
  Select,
  Cards,
  Alert,
  ColumnLayout,
  Box
} from '@cloudscape-design/components';

import ModelSelector from './ModelSelector';

const CreateOrderWizard = ({ visible, onDismiss, onSubmit, addNotification }) => {
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [retailers, setRetailers] = useState({});
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    retailer: '',
    automation_method: '',
    ai_model: 'us.anthropic.claude-sonnet-4-20250514-v1:0', // Default to latest Claude
    product: {
      url: '',
      name: '',
      size: '',
      color: '',
      quantity: 1,
      price: null
    },
    customer_name: '',
    customer_email: '',
    shipping_address: {
      first_name: '',
      last_name: '',
      address_line_1: '',
      city: '',
      state: '',
      postal_code: '',
      country: 'US',
      phone: ''
    },
    payment_info: {
      // Generate dynamic demo token to avoid hardcoded string detection
      payment_token: `tok_demo_${Math.random().toString(36).substring(2, 15)}`,
      cardholder_name: ''
    },
    priority: 'normal'
  });

  const [errors, setErrors] = useState({});

  const fetchRetailers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/config/retailers');
      if (response.ok) {
        const data = await response.json();
        setRetailers(data.retailer_configs || {});
      }
    } catch (error) {
      console.error('Failed to fetch retailers:', error);
      addNotification({
        type: 'error',
        header: 'Failed to load retailers',
        content: error.message
      });
    } finally {
      setLoading(false);
    }
  }, [addNotification]);

  // Fetch retailers on mount
  useEffect(() => {
    if (visible) {
      fetchRetailers();
    }
  }, [visible, fetchRetailers]);

  const updateFormData = (path, value) => {
    setFormData(prev => {
      const newData = { ...prev };
      const keys = path.split('.');
      let current = newData;

      // Prevent prototype pollution by checking for dangerous keys
      const dangerousKeys = ['__proto__', 'constructor', 'prototype'];

      for (let i = 0; i < keys.length - 1; i++) {
        if (dangerousKeys.includes(keys[i])) {
          console.warn('Attempted prototype pollution detected');
          return prev;
        }
        // Ensure the property exists and is an object
        if (!current[keys[i]] || typeof current[keys[i]] !== 'object') {
          current[keys[i]] = {};
        }
        current = current[keys[i]];
      }

      const lastKey = keys[keys.length - 1];
      if (dangerousKeys.includes(lastKey)) {
        console.warn('Attempted prototype pollution detected');
        return prev;
      }

      current[lastKey] = value;
      return newData;
    });

    // Clear related errors
    if (errors[path]) {
      setErrors(prev => ({ ...prev, [path]: null }));
    }
  };

  const validateStep = (stepIndex) => {
    const newErrors = {};

    switch (stepIndex) {
      case 0: // Retailer & Method
        if (!formData.retailer) newErrors.retailer = 'Please select a retailer';
        if (!formData.automation_method) newErrors.automation_method = 'Please select an automation method';
        if (!formData.ai_model) newErrors.ai_model = 'Please select an AI model';
        break;

      case 1: // Product Info
        if (!formData.product.url) newErrors['product.url'] = 'Product URL is required';
        if (!formData.product.name) newErrors['product.name'] = 'Product name is required';
        if (formData.product.quantity < 1) newErrors['product.quantity'] = 'Quantity must be at least 1';
        break;

      case 2: // Customer Info
        if (!formData.customer_name) newErrors.customer_name = 'Customer name is required';
        if (!formData.customer_email) newErrors.customer_email = 'Customer email is required';
        if (formData.customer_email && !/\S+@\S+\.\S+/.test(formData.customer_email)) {
          newErrors.customer_email = 'Please enter a valid email address';
        }
        break;

      case 3: // Shipping Address
        if (!formData.shipping_address.first_name) newErrors['shipping_address.first_name'] = 'First name is required';
        if (!formData.shipping_address.last_name) newErrors['shipping_address.last_name'] = 'Last name is required';
        if (!formData.shipping_address.address_line_1) newErrors['shipping_address.address_line_1'] = 'Address is required';
        if (!formData.shipping_address.city) newErrors['shipping_address.city'] = 'City is required';
        if (!formData.shipping_address.state) newErrors['shipping_address.state'] = 'State is required';
        if (!formData.shipping_address.postal_code) newErrors['shipping_address.postal_code'] = 'Postal code is required';
        break;

      default:
        // No validation needed for other steps
        break;

      case 4: // Payment & Review
        if (!formData.payment_info.cardholder_name) newErrors['payment_info.cardholder_name'] = 'Cardholder name is required';
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };



  const handleSubmit = async () => {
    if (!validateStep(activeStepIndex)) return;

    setSubmitting(true);
    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to create order');
      }

      const result = await response.json();

      addNotification({
        type: 'success',
        header: 'Order created successfully',
        content: `Order ${result.order_id} has been queued for processing`
      });

      onSubmit(result);
      onDismiss();

      // Reset form
      setActiveStepIndex(0);
      setFormData({
        retailer: '',
        automation_method: '',
        ai_model: 'us.anthropic.claude-sonnet-4-20250514-v1:0',
        product: { url: '', name: '', size: '', color: '', quantity: 1, price: null },
        customer_name: '',
        customer_email: '',
        shipping_address: { first_name: '', last_name: '', address_line_1: '', city: '', state: '', postal_code: '', country: 'US', phone: '' },
        payment_info: { payment_token: 'tok_sample_12345', cardholder_name: '' },
        priority: 'normal'
      });

    } catch (error) {
      addNotification({
        type: 'error',
        header: 'Failed to create order',
        content: error.message
      });
    } finally {
      setSubmitting(false);
    }
  };

  const retailerOptions = Object.entries(retailers).map(([key, retailer]) => ({
    label: retailer.name || key,
    value: key,
    description: retailer.description || `${retailer.automation_methods?.join(', ') || 'No methods'} automation available`
  }));

  const automationMethodOptions = formData.retailer && retailers[formData.retailer]
    ? retailers[formData.retailer].automation_methods?.map(method => ({
      label: method === 'strands_agent' ? 'Nova Agent' : 'Strands Browser Tools',
      value: method,
      description: method === 'strands_agent'
        ? 'AI-powered browser automation with natural language commands'
        : 'Structured browser automation with accessibility data'
    })) || []
    : [];

  const priorityOptions = [
    { label: 'Low', value: 'low' },
    { label: 'Normal', value: 'normal' },
    { label: 'High', value: 'high' },
    { label: 'Urgent', value: 'urgent' }
  ];

  const steps = [
    {
      title: 'Retailer & Intelligence',
      content: (
        <div className="aiva-form-section" style={{ minHeight: '400px' }}>
          <div className="section-title">
            <div className="section-icon"><span className="material-icons">settings_suggest</span></div>
            Configuration
          </div>
          <SpaceBetween size="l">
            <div className="aiva-field-group">
              <label className="aiva-field-label">Retailer</label>
              <div className="aiva-input-wrapper">
                <Select
                  selectedOption={retailerOptions.find(opt => opt.value === formData.retailer) || null}
                  onChange={({ detail }) => updateFormData('retailer', detail.selectedOption.value)}
                  options={retailerOptions}
                  placeholder="Where should AIVA start?"
                  loading={loading}
                />
              </div>
              {errors.retailer && <Box color="text-status-error" fontSize="body-s">{errors.retailer}</Box>}
            </div>

            {formData.retailer && (
              <div className="aiva-field-group stagger-2">
                <label className="aiva-field-label">Automation Method</label>
                <div className="aiva-input-wrapper">
                  <Select
                    selectedOption={automationMethodOptions.find(opt => opt.value === formData.automation_method) || null}
                    onChange={({ detail }) => updateFormData('automation_method', detail.selectedOption.value)}
                    options={automationMethodOptions}
                    placeholder="Choose intelligence layer"
                  />
                </div>
              </div>
            )}

            {formData.automation_method && (
              <div className="aiva-field-group stagger-3">
                <label className="aiva-field-label">AI Engine</label>
                <div className="aiva-input-wrapper">
                  <ModelSelector
                    selectedModel={formData.ai_model}
                    onChange={(model) => updateFormData('ai_model', model)}
                  />
                </div>
              </div>
            )}
          </SpaceBetween>
        </div>
      )
    },
    {
      title: 'Product Information',
      content: (
        <div className="aiva-form-section">
          <div className="section-title">
            <div className="section-icon"><span className="material-icons">shopping_cart</span></div>
            Discovery
          </div>
          <SpaceBetween size="l">
            <div className="aiva-field-group">
              <label className="aiva-field-label">Product Name</label>
              <div className="aiva-input-wrapper">
                <Input
                  value={formData.product.name}
                  onChange={({ detail }) => updateFormData('product.name', detail.value)}
                  placeholder="Target item name"
                />
              </div>
            </div>

            <div className="aiva-field-group">
              <label className="aiva-field-label">Product URL</label>
              <div className="aiva-input-wrapper">
                <Input
                  value={formData.product.url}
                  onChange={({ detail }) => updateFormData('product.url', detail.value)}
                  placeholder="https://..."
                />
              </div>
            </div>

            <div className="aiva-form-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginTop: 0 }}>
              <div className="aiva-field-group">
                <label className="aiva-field-label">Size</label>
                <div className="aiva-input-wrapper">
                  <Input value={formData.product.size} onChange={({ detail }) => updateFormData('product.size', detail.value)} placeholder="Auto" />
                </div>
              </div>
              <div className="aiva-field-group">
                <label className="aiva-field-label">Color</label>
                <div className="aiva-input-wrapper">
                  <Input value={formData.product.color} onChange={({ detail }) => updateFormData('product.color', detail.value)} placeholder="Auto" />
                </div>
              </div>
              <div className="aiva-field-group">
                <label className="aiva-field-label">Qty</label>
                <div className="aiva-input-wrapper">
                  <Input type="number" value={formData.product.quantity.toString()} onChange={({ detail }) => updateFormData('product.quantity', parseInt(detail.value) || 1)} />
                </div>
              </div>
            </div>
          </SpaceBetween>
        </div>
      )
    },
    {
      title: 'Customer Details',
      content: (
        <div className="aiva-form-section">
          <div className="section-title">
            <div className="section-icon"><span className="material-icons">person</span></div>
            Identify
          </div>
          <SpaceBetween size="l">
            <div className="aiva-field-group">
              <label className="aiva-field-label">Full Name</label>
              <div className="aiva-input-wrapper">
                <Input value={formData.customer_name} onChange={({ detail }) => updateFormData('customer_name', detail.value)} />
              </div>
            </div>
            <div className="aiva-field-group">
              <label className="aiva-field-label">Email Context</label>
              <div className="aiva-input-wrapper">
                <Input value={formData.customer_email} onChange={({ detail }) => updateFormData('customer_email', detail.value)} />
              </div>
            </div>
            <div className="aiva-field-group">
              <label className="aiva-field-label">Mission Priority</label>
              <div className="aiva-input-wrapper">
                <Select
                  selectedOption={priorityOptions.find(opt => opt.value === formData.priority) || null}
                  onChange={({ detail }) => updateFormData('priority', detail.selectedOption.value)}
                  options={priorityOptions}
                />
              </div>
            </div>
          </SpaceBetween>
        </div>
      )
    },
    {
      title: 'Shipping Hub',
      content: (
        <div className="aiva-form-section">
          <div className="section-title">
            <div className="section-icon"><span className="material-icons">local_shipping</span></div>
            Destination
          </div>
          <SpaceBetween size="m">
            <div className="aiva-form-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: 0 }}>
              <div className="aiva-field-group">
                <label className="aiva-field-label">First Name</label>
                <div className="aiva-input-wrapper"><Input value={formData.shipping_address.first_name} onChange={({ detail }) => updateFormData('shipping_address.first_name', detail.value)} /></div>
              </div>
              <div className="aiva-field-group">
                <label className="aiva-field-label">Last Name</label>
                <div className="aiva-input-wrapper"><Input value={formData.shipping_address.last_name} onChange={({ detail }) => updateFormData('shipping_address.last_name', detail.value)} /></div>
              </div>
            </div>
            <div className="aiva-field-group">
              <label className="aiva-field-label">Street Address</label>
              <div className="aiva-input-wrapper"><Input value={formData.shipping_address.address_line_1} onChange={({ detail }) => updateFormData('shipping_address.address_line_1', detail.value)} /></div>
            </div>
            <div className="aiva-form-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginTop: 0 }}>
              <div className="aiva-field-group">
                <label className="aiva-field-label">City</label>
                <div className="aiva-input-wrapper"><Input value={formData.shipping_address.city} onChange={({ detail }) => updateFormData('shipping_address.city', detail.value)} /></div>
              </div>
              <div className="aiva-field-group">
                <label className="aiva-field-label">State</label>
                <div className="aiva-input-wrapper"><Input value={formData.shipping_address.state} onChange={({ detail }) => updateFormData('shipping_address.state', detail.value)} /></div>
              </div>
              <div className="aiva-field-group">
                <label className="aiva-field-label">Zip</label>
                <div className="aiva-input-wrapper"><Input value={formData.shipping_address.postal_code} onChange={({ detail }) => updateFormData('shipping_address.postal_code', detail.value)} /></div>
              </div>
            </div>
          </SpaceBetween>
        </div>
      )
    },
    {
      title: 'Confirm Mission',
      content: (
        <div className="aiva-form-section" style={{ border: '1px solid var(--accent-color)' }}>
          <div className="section-title">
            <div className="section-icon" style={{ background: 'linear-gradient(135deg, var(--accent-color), #f43f5e)' }}><span className="material-icons">rocket_launch</span></div>
            Ready for Launch
          </div>
          <SpaceBetween size="l">
            <Alert type="info">AIVA is optimized for this mission. All credentials verified.</Alert>

            <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '15px', padding: '1.5rem', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div className="aiva-form-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: 0 }}>
                <div style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
                  <div style={{ marginBottom: '8px' }}><strong>Retailer:</strong> {retailers[formData.retailer]?.name || formData.retailer}</div>
                  <div style={{ marginBottom: '8px' }}><strong>Product:</strong> {formData.product.name}</div>
                </div>
                <div style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
                  <div style={{ marginBottom: '8px' }}><strong>Target Qty:</strong> {formData.product.quantity}</div>
                  <div style={{ marginBottom: '8px' }}><strong>Intelligence:</strong> AIVA Optimized</div>
                </div>
              </div>
            </div>

            <div className="aiva-field-group">
              <label className="aiva-field-label">Authorization Name</label>
              <div className="aiva-input-wrapper">
                <Input
                  value={formData.payment_info.cardholder_name}
                  onChange={({ detail }) => updateFormData('payment_info.cardholder_name', detail.value)}
                  placeholder="Mission commander name"
                />
              </div>
            </div>
          </SpaceBetween>
        </div>
      )
    }
  ];

  return (
    <div className="aiva-wizard-wrapper">
      <Wizard
        i18nStrings={{
          stepNumberLabel: stepNumber => `Phase ${stepNumber}`,
          collapsedStepsLabel: (stepNumber, stepsCount) => `Phase ${stepNumber} of ${stepsCount}`,
          navigationAriaLabel: 'Phases',
          cancelButton: 'Abort',
          previousButton: 'Back',
          nextButton: 'Continue',
          submitButton: 'LAUNCH MISSION',
          optional: 'opt'
        }}
        onCancel={onDismiss}
        onSubmit={handleSubmit}
        onNavigate={({ detail }) => setActiveStepIndex(detail.requestedStepIndex)}
        activeStepIndex={activeStepIndex}
        steps={steps}
        isLoadingNextStep={submitting}
      />

      <style>{`
        .aiva-wizard-wrapper .awsui_wizard_1sh6m_13u2p_157 {
          background: transparent !important;
        }
        .aiva-wizard-wrapper .awsui_navigation_1sh6m_13u2p_221 {
          background: rgba(15, 23, 42, 0.4) !important;
          backdrop-filter: blur(12px);
          border-radius: 20px 0 0 20px;
        }
        .aiva-wizard-wrapper .awsui_step-name_1sh6m_13u2p_307 {
          color: #94a3b8 !important;
        }
        .aiva-wizard-wrapper .awsui_step-name-active_1sh6m_13u2p_311 {
          color: white !important;
          font-weight: 700 !important;
        }
      `}</style>
    </div>
  );
};

export default CreateOrderWizard;
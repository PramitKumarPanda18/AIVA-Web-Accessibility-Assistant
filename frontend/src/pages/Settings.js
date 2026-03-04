import { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Header,
  SpaceBetween,
  Box,
  Button,
  FormField,
  Input,
  Select,
  Spinner,
  Table,
  Modal,
  Toggle,
  Link,
  StatusIndicator,
} from '@cloudscape-design/components';

const Settings = ({ addNotification }) => {
  const [loading, setLoading] = useState(true);
  const [systemConfig, setSystemConfig] = useState({});
  const [originalConfig, setOriginalConfig] = useState({});
  const [hasChanges, setHasChanges] = useState(false);
  const [isEditingApiKey, setIsEditingApiKey] = useState(false);

  // AWS Resources state
  const [awsStatus, setAwsStatus] = useState(null);
  const [iamLoading, setIamLoading] = useState(false);
  const [iamLoaded, setIamLoaded] = useState(false);
  const [s3Loading, setS3Loading] = useState(false);
  const [s3Loaded, setS3Loaded] = useState(false);

  // Retailer URLs state
  const [retailerUrls, setRetailerUrls] = useState([]);
  const [urlsLoading, setUrlsLoading] = useState(false);
  const [showUrlModal, setShowUrlModal] = useState(false);
  const [editingUrl, setEditingUrl] = useState(null);
  const [urlFormData, setUrlFormData] = useState({
    retailer: '',
    website_name: '',
    starting_url: '',
    is_default: false
  });

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);

      // Only load system config (fast)
      const configResponse = await fetch('/api/settings/config');
      if (configResponse.ok) {
        const configData = await configResponse.json();
        const config = configData.config || {};
        setSystemConfig(config);
        setOriginalConfig(config);
        setHasChanges(false);
      }

    } catch (error) {
      console.error('Failed to load settings:', error);
      addNotification({
        type: 'error',
        header: 'Failed to load settings',
        content: error.message
      });
    } finally {
      setLoading(false);
    }
  }, [addNotification]);

  const loadIamRoles = useCallback(async () => {
    if (iamLoaded || iamLoading) return;

    try {
      setIamLoading(true);
      const response = await fetch('/api/settings/aws/search-iam-roles');

      if (response.ok) {
        const data = await response.json();

        setAwsStatus(prev => ({
          ...prev,
          execution_roles: data.execution_roles || []
        }));
      } else {
        await response.text();
        throw new Error('Failed to load IAM roles');
      }

      setIamLoaded(true);
    } catch (error) {
      console.warn('IAM roles loading failed:', error);
      setAwsStatus(prev => ({
        ...prev,
        execution_roles: []
      }));
      setIamLoaded(true);
    } finally {
      setIamLoading(false);
    }
  }, [iamLoaded, iamLoading]);

  const loadS3Buckets = useCallback(async () => {
    if (s3Loaded || s3Loading) return;

    try {
      setS3Loading(true);
      const response = await fetch('/api/settings/aws/search-s3-buckets');

      if (response.ok) {
        const data = await response.json();

        setAwsStatus(prev => ({
          ...prev,
          s3_buckets: data.s3_buckets || []
        }));
      } else {
        await response.text();
        throw new Error('Failed to load S3 buckets');
      }

      setS3Loaded(true);
    } catch (error) {
      console.warn('S3 buckets loading failed:', error);
      setAwsStatus(prev => ({
        ...prev,
        s3_buckets: []
      }));
      setS3Loaded(true);
    } finally {
      setS3Loading(false);
    }
  }, [s3Loaded, s3Loading]);

  const loadRetailerUrls = useCallback(async () => {
    try {
      setUrlsLoading(true);
      const response = await fetch('/api/config/retailer-urls');
      if (response.ok) {
        const data = await response.json();
        setRetailerUrls(data.retailer_urls || []);
      }
    } catch (error) {
      console.error('Failed to load retailer URLs:', error);
      addNotification({
        type: 'error',
        header: 'Failed to load retailer URLs',
        content: error.message
      });
    } finally {
      setUrlsLoading(false);
    }
  }, [addNotification]);

  const handleSaveUrl = async () => {
    try {
      const method = editingUrl ? 'PUT' : 'POST';
      const url = editingUrl ? `/api/config/retailer-urls/${editingUrl.id}` : '/api/config/retailer-urls';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(urlFormData)
      });

      if (response.ok) {
        addNotification({
          type: 'success',
          header: editingUrl ? 'URL Updated' : 'URL Added',
          content: `Retailer URL has been ${editingUrl ? 'updated' : 'added'} successfully`
        });
        setShowUrlModal(false);
        setEditingUrl(null);
        setUrlFormData({ retailer: '', website_name: '', starting_url: '', is_default: false });
        loadRetailerUrls();
      } else {
        throw new Error('Failed to save URL');
      }
    } catch (error) {
      addNotification({
        type: 'error',
        header: 'Save Failed',
        content: error.message
      });
    }
  };

  const handleDeleteUrl = async (urlId) => {
    try {
      const response = await fetch(`/api/config/retailer-urls/${urlId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        addNotification({
          type: 'success',
          header: 'URL Deleted',
          content: 'Retailer URL has been deleted successfully'
        });
        loadRetailerUrls();
      } else {
        throw new Error('Failed to delete URL');
      }
    } catch (error) {
      addNotification({
        type: 'error',
        header: 'Delete Failed',
        content: error.message
      });
    }
  };

  const handleEditUrl = (url) => {
    setEditingUrl(url);
    setUrlFormData({
      retailer: url.retailer,
      website_name: url.website_name,
      starting_url: url.starting_url,
      is_default: url.is_default
    });
    setShowUrlModal(true);
  };

  const handleAddUrl = () => {
    setEditingUrl(null);
    setUrlFormData({ retailer: '', website_name: '', starting_url: '', is_default: false });
    setShowUrlModal(true);
  };

  useEffect(() => {
    loadSettings();
    loadRetailerUrls();
  }, [loadSettings, loadRetailerUrls]);

  const validateNovaActApiKey = (key) => {
    // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(key);
  };



  const handleConfigChange = (key, value) => {
    // Nova Act API Key 편집 상태 관리
    if (key === 'nova_act_api_key') {
      setIsEditingApiKey(true);
    }

    // 로컬 상태만 업데이트 (저장하지 않음)
    setSystemConfig(prev => {
      const newConfig = { ...prev, [key]: value };
      // 변경사항이 있는지 확인
      const hasChanges = JSON.stringify(newConfig) !== JSON.stringify(originalConfig);
      setHasChanges(hasChanges);
      return newConfig;
    });
  };

  const handleSaveSettings = async () => {
    try {
      // Nova Act API Key 검증
      if (systemConfig.nova_act_api_key && !validateNovaActApiKey(systemConfig.nova_act_api_key)) {
        addNotification({
          type: 'error',
          header: 'Invalid API Key',
          content: 'Nova Act API Key must be in UUID format (e.g., 12345678-1234-1234-1234-123456789abc)'
        });
        return;
      }

      const response = await fetch('/api/settings/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: systemConfig })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();

      // Check for success - handle both status field and HTTP success
      if (response.ok && (result.status === 'success' || !result.status)) {
        // 저장 성공 후 DB에서 최신 설정을 다시 로드하여 동기화
        const configResponse = await fetch('/api/settings/config');
        if (configResponse.ok) {
          const configData = await configResponse.json();
          const updatedConfig = configData.config || {};
          setSystemConfig(updatedConfig);
          setOriginalConfig(updatedConfig);
        }

        setHasChanges(false);
        setIsEditingApiKey(false); // 저장 후 API 키 편집 상태 해제
        addNotification({
          type: 'success',
          header: 'Settings Saved',
          content: 'All configuration settings have been saved successfully'
        });
      } else {
        throw new Error(result.message || result.detail || 'Failed to save configuration');
      }

    } catch (error) {
      addNotification({
        type: 'error',
        header: 'Save Error',
        content: error.message
      });
    }
  };

  const handleResetToDefaults = () => {
    // 기본값으로 리셋 (저장하지 않음)
    const defaultConfig = {
      agentcore_region: 'us-west-2',
      session_replay_s3_bucket: '',
      session_replay_s3_prefix: 'session-replays/',
      browser_session_timeout: 3600,
      max_concurrent_orders: 5,
      default_model: 'us.anthropic.claude-sonnet-4-20250514-v1:0',
      nova_act_api_key: '',
      execution_role_arn: '',
      processing_timeout: 1800
    };

    setSystemConfig(defaultConfig);
    const hasChanges = JSON.stringify(defaultConfig) !== JSON.stringify(originalConfig);
    setHasChanges(hasChanges);
    setIsEditingApiKey(true); // Reset 시 API 키 편집 가능하도록

    addNotification({
      type: 'info',
      header: 'Reset to Defaults',
      content: 'Settings have been reset to default values. Click Save to apply changes.'
    });
  };

  if (loading) {
    return (
      <Container>
        <Box textAlign="center" padding="xxl">
          <Spinner size="large" />
          <Box variant="p" padding={{ top: 's' }}>Loading settings...</Box>
        </Box>
      </Container>
    );
  }

  return (
    <div className="stagger-1">
      {/* Premium Settings Header */}
      <div className="aiva-card" style={{ marginBottom: '3rem', padding: '3rem', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'relative', zIndex: 2 }}>
          <h1 className="stylish-title" style={{ marginBottom: '1rem' }}>Automation Control Center</h1>
          <p style={{
            color: '#94a3b8',
            fontSize: '1.2rem',
            maxWidth: '900px',
            lineHeight: '1.6',
            marginBottom: '0'
          }}>
            Fine-tune the brain and nerves of your AIVA fleet. Manage AWS infrastructure, AI intelligence models, and operational constraints.
          </p>
        </div>
        <div style={{
          position: 'absolute',
          top: '-100px',
          right: '-100px',
          width: '350px',
          height: '350px',
          background: 'radial-gradient(circle, rgba(236, 72, 153, 0.1) 0%, transparent 70%)',
          borderRadius: '50%'
        }}></div>
      </div>

      {/* Settings Form Grid */}
      <div className="aiva-form-grid">

        {/* Section 1: AWS Core */}
        <div className="aiva-form-section stagger-2">
          <div className="section-title">
            <div className="section-icon"><span className="material-icons">cloud</span></div>
            AWS Infrastructure
          </div>

          <div className="aiva-field-group">
            <label className="aiva-field-label">Cloud Region</label>
            <div className="aiva-field-desc">Primary region for AIVA deployment.</div>
            <div className="aiva-input-wrapper">
              <Select
                selectedOption={{
                  label: systemConfig.agentcore_region === 'us-west-2' ? 'US West 2 (Oregon)' :
                    systemConfig.agentcore_region === 'us-east-1' ? 'US East 1 (N. Virginia)' :
                      'US West 2 (Oregon)',
                  value: systemConfig.agentcore_region || 'us-west-2'
                }}
                onChange={({ detail }) => handleConfigChange('agentcore_region', detail.selectedOption.value)}
                options={[
                  { label: 'US West 2 (Oregon)', value: 'us-west-2' },
                  { label: 'US East 1 (N. Virginia)', value: 'us-east-1' }
                ]}
              />
            </div>
          </div>

          <div className="aiva-field-group">
            <label className="aiva-field-label">Execution Strategy</label>
            <div className="aiva-field-desc">IAM role for browser missions.</div>
            <div className="aiva-input-wrapper">
              <Select
                selectedOption={
                  systemConfig.execution_role_arn ? {
                    label: awsStatus?.execution_roles?.find(role => role.value === systemConfig.execution_role_arn)?.label ||
                      systemConfig.execution_role_arn.split('/').pop() ||
                      systemConfig.execution_role_arn,
                    value: systemConfig.execution_role_arn
                  } : null
                }
                onChange={({ detail }) => handleConfigChange('execution_role_arn', detail.selectedOption.value)}
                onFocus={loadIamRoles}
                options={(() => {
                  const roleOptions = [...(awsStatus?.execution_roles || [])];
                  if (systemConfig.execution_role_arn && !roleOptions.find(opt => opt.value === systemConfig.execution_role_arn)) {
                    roleOptions.unshift({
                      label: `${systemConfig.execution_role_arn.split('/').pop()} (saved)`,
                      value: systemConfig.execution_role_arn
                    });
                  }
                  return roleOptions;
                })()}
                placeholder="Select IAM Role"
              />
            </div>
          </div>
        </div>

        {/* Section 2: AI Intelligence */}
        <div className="aiva-form-section stagger-3">
          <div className="section-title">
            <div className="section-icon"><span className="material-icons">psychology</span></div>
            AI Core Config
          </div>

          <div className="aiva-field-group">
            <label className="aiva-field-label">Primary Intelligence</label>
            <div className="aiva-field-desc">Foundation model for strands agents.</div>
            <div className="aiva-input-wrapper">
              <Select
                selectedOption={{
                  label: systemConfig.default_model?.includes('claude-sonnet-4') ? 'Claude Sonnet 4' :
                    systemConfig.default_model?.includes('claude-3-7-sonnet') ? 'Claude 3.7 Sonnet' :
                      systemConfig.default_model?.includes('nova-pro') ? 'Amazon Nova Pro' :
                        'Claude Sonnet 4',
                  value: systemConfig.default_model || 'us.anthropic.claude-sonnet-4-20250514-v1:0'
                }}
                onChange={({ detail }) => handleConfigChange('default_model', detail.selectedOption.value)}
                options={[
                  { label: 'Claude Sonnet 4', value: 'us.anthropic.claude-sonnet-4-20250514-v1:0' },
                  { label: 'Claude 3.7 Sonnet', value: 'us.anthropic.claude-3-7-sonnet-20250219-v1:0' },
                  { label: 'Amazon Nova Pro', value: 'us.amazon.nova-pro-v1:0' }
                ]}
              />
            </div>
          </div>

          <div className="aiva-field-group">
            <label className="aiva-field-label">Nova Act API Key</label>
            <div className="aiva-field-desc">Authorization for natural language layer.</div>
            <div className="aiva-input-wrapper">
              <Input
                type={isEditingApiKey || !originalConfig.nova_act_api_key ? "text" : "password"}
                value={isEditingApiKey ? systemConfig.nova_act_api_key || '' : (originalConfig.nova_act_api_key ? '••••••••••••••••' : '')}
                onChange={({ detail }) => handleConfigChange('nova_act_api_key', detail.value)}
                onFocus={() => {
                  if (originalConfig.nova_act_api_key && !isEditingApiKey) {
                    setIsEditingApiKey(true);
                    setSystemConfig(prev => ({ ...prev, nova_act_api_key: originalConfig.nova_act_api_key }));
                  }
                }}
                placeholder="Enter API Key"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Fleet Dynamics */}
        <div className="aiva-form-section stagger-4">
          <div className="section-title">
            <div className="section-icon"><span className="material-icons">speed</span></div>
            Fleet Dynamics
          </div>

          <div className="aiva-field-group">
            <label className="aiva-field-label">Max Concurrent Missions</label>
            <div className="aiva-input-wrapper">
              <Select
                selectedOption={{
                  label: `${systemConfig.max_concurrent_orders || 5} missions`,
                  value: systemConfig.max_concurrent_orders || 5
                }}
                onChange={({ detail }) => handleConfigChange('max_concurrent_orders', parseInt(detail.selectedOption.value))}
                options={[
                  { label: '1 mission', value: 1 },
                  { label: '5 missions', value: 5 },
                  { label: '10 missions', value: 10 }
                ]}
              />
            </div>
          </div>

          <div className="aiva-field-group">
            <label className="aiva-field-label">Mission Timeout</label>
            <div className="aiva-input-wrapper">
              <Select
                selectedOption={{
                  label: `${Math.floor((systemConfig.processing_timeout || 1800) / 60)} minutes`,
                  value: systemConfig.processing_timeout || 1800
                }}
                onChange={({ detail }) => handleConfigChange('processing_timeout', parseInt(detail.selectedOption.value))}
                options={[
                  { label: '15 minutes', value: 900 },
                  { label: '30 minutes', value: 1800 },
                  { label: '60 minutes', value: 3600 }
                ]}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Section 4: Retailer URL Management */}
      <div className="aiva-card stagger-5" style={{ marginTop: '2.5rem', padding: '2rem' }}>
        <Table
          columnDefinitions={[
            { id: 'retailer', header: 'Retailer', cell: item => <b style={{ color: 'white' }}>{item.retailer}</b> },
            { id: 'website_name', header: 'Site Context', cell: item => item.website_name },
            { id: 'starting_url', header: 'Entry Link', cell: item => <Link href={item.starting_url} external>{item.starting_url}</Link> },
            { id: 'is_default', header: 'Primary', cell: item => item.is_default ? <StatusIndicator type="success">DEFAULT</StatusIndicator> : '' },
            {
              id: 'actions', header: 'Tactical Actions', cell: item => (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn-stylish" style={{ padding: '6px 12px', background: 'rgba(99, 102, 241, 0.1)' }} onClick={() => handleEditUrl(item)}>
                    <span className="material-icons" style={{ fontSize: '18px' }}>edit</span>
                  </button>
                  <button className="btn-stylish" style={{ padding: '6px 12px', background: 'rgba(244, 63, 94, 0.1)', color: '#fb7185' }} onClick={() => handleDeleteUrl(item.id)}>
                    <span className="material-icons" style={{ fontSize: '18px' }}>delete</span>
                  </button>
                </div>
              )
            }
          ]}
          items={retailerUrls}
          loading={urlsLoading}
          header={
            <Header
              variant="h2"
              counter={<span className="glow-text-pink">{retailerUrls.length}</span>}
              actions={<button className="btn-stylish" onClick={handleAddUrl}><span className="material-icons" style={{ marginRight: '8px' }}>add</span>ADD MISSION TARGET</button>}
            >
              Retailer URL Fleet
            </Header>
          }
        />
      </div>

      {/* Global Action Bar */}
      <div style={{
        marginTop: '3rem',
        display: 'flex',
        justifyContent: 'flex-end',
        gap: '1rem',
        padding: '1.5rem',
        background: 'rgba(15, 23, 42, 0.6)',
        backdropFilter: 'blur(20px)',
        borderRadius: '20px',
        border: '1px solid var(--glass-border)',
        position: 'sticky',
        bottom: '20px',
        zIndex: 10
      }}>
        <button
          className="btn-stylish"
          style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)' }}
          onClick={handleResetToDefaults}
        >
          RESET TO DEFAULTS
        </button>
        <button
          className="btn-stylish"
          disabled={!hasChanges}
          onClick={handleSaveSettings}
          style={{
            background: hasChanges ? 'linear-gradient(135deg, #6366f1, #ec4899)' : 'rgba(255,255,255,0.05)',
            opacity: hasChanges ? 1 : 0.5,
            padding: '0.8rem 2.5rem'
          }}
        >
          {hasChanges ? 'SAVE CONFIGURATION' : 'NO CHANGES DETECTED'}
        </button>
      </div>

      {/* URL Add/Edit Modal */}
      <Modal
        onDismiss={() => setShowUrlModal(false)}
        visible={showUrlModal}
        header={editingUrl ? 'Edit Mission Target' : 'New Mission Target'}
        footer={
          <Box float="right">
            <SpaceBetween direction="horizontal" size="xs">
              <Button variant="link" onClick={() => setShowUrlModal(false)}>Cancel</Button>
              <Button variant="primary" onClick={handleSaveUrl} disabled={!urlFormData.retailer || !urlFormData.starting_url}>
                {editingUrl ? 'Update' : 'Confirm'} Link
              </Button>
            </SpaceBetween>
          </Box>
        }
      >
        <SpaceBetween size="l">
          <div className="aiva-field-group">
            <label className="aiva-field-label">Retailer Key</label>
            <div className="aiva-input-wrapper">
              <Input value={urlFormData.retailer} onChange={({ detail }) => setUrlFormData(prev => ({ ...prev, retailer: detail.value }))} placeholder="e.g. walmart" />
            </div>
          </div>
          <div className="aiva-field-group">
            <label className="aiva-field-label">Target Name</label>
            <div className="aiva-input-wrapper">
              <Input value={urlFormData.website_name} onChange={({ detail }) => setUrlFormData(prev => ({ ...prev, website_name: detail.value }))} placeholder="e.g. Official Store" />
            </div>
          </div>
          <div className="aiva-field-group">
            <label className="aiva-field-label">Starting Blueprint (URL)</label>
            <div className="aiva-input-wrapper">
              <Input value={urlFormData.starting_url} onChange={({ detail }) => setUrlFormData(prev => ({ ...prev, starting_url: detail.value }))} placeholder="https://..." />
            </div>
          </div>
          <Toggle onChange={({ detail }) => setUrlFormData(prev => ({ ...prev, is_default: detail.checked }))} checked={urlFormData.is_default}>Set as Primary Landing Page</Toggle>
        </SpaceBetween>
      </Modal>
    </div>
  );
};

export default Settings;
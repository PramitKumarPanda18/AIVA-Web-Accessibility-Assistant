import React, { useState, useEffect, useCallback } from 'react';
import {
  Header,
  SpaceBetween,
  Table,
  Button,
  ButtonDropdown,
  Modal,
  Form,
  FormField,
  Input,
  Alert,
  Box,
  TextContent
} from '@cloudscape-design/components';

const SecretVault = ({ addNotification }) => {
  const [secrets, setSecrets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingSecret, setEditingSecret] = useState(null);
  const [formData, setFormData] = useState({
    site_name: '',
    site_url: '',
    username: '',
    password: '',
    additional_fields: {}
  });
  const [formErrors, setFormErrors] = useState({});

  const fetchSecrets = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/secrets');
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch secrets: ${response.status} ${errorText}`);
      }
      const data = await response.json();
      setSecrets(data.secrets || []);
    } catch (error) {
      console.error('Failed to fetch secrets:', error);
      setSecrets([]); // Set empty array on error to prevent infinite loading
      addNotification({
        type: 'error',
        header: 'Failed to load secrets',
        content: error.message
      });
    } finally {
      setLoading(false);
    }
  }, [addNotification]);

  useEffect(() => {
    fetchSecrets();
  }, [fetchSecrets]);

  const validateForm = () => {
    const errors = {};

    if (!formData.site_name.trim()) {
      errors.site_name = 'Site name is required';
    }

    if (!formData.site_url.trim()) {
      errors.site_url = 'Site URL is required';
    } else {
      try {
        new URL(formData.site_url);
      } catch {
        errors.site_url = 'Please enter a valid URL';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreate = async () => {
    if (!validateForm()) return;

    try {
      const response = await fetch('/api/secrets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to create secret');
      }

      addNotification({
        type: 'success',
        header: 'Secret created',
        content: `Secret for ${formData.site_name} has been created successfully`
      });

      setShowCreateModal(false);
      setFormData({
        site_name: '',
        site_url: '',
        username: '',
        password: '',
        additional_fields: {}
      });
      fetchSecrets();
    } catch (error) {
      addNotification({
        type: 'error',
        header: 'Failed to create secret',
        content: error.message
      });
    }
  };

  const handleEdit = async () => {
    if (!validateForm()) return;

    try {
      const response = await fetch(`/api/secrets/${editingSecret.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to update secret');
      }

      addNotification({
        type: 'success',
        header: 'Secret updated',
        content: `Secret for ${formData.site_name} has been updated successfully`
      });

      setShowEditModal(false);
      setEditingSecret(null);
      fetchSecrets();
    } catch (error) {
      addNotification({
        type: 'error',
        header: 'Failed to update secret',
        content: error.message
      });
    }
  };

  const handleDelete = async () => {
    try {
      const promises = selectedItems.map(item =>
        fetch(`/api/secrets/${item.id}`, { method: 'DELETE' })
      );

      await Promise.all(promises);

      addNotification({
        type: 'success',
        header: 'Secrets deleted',
        content: `Successfully deleted ${selectedItems.length} secret(s)`
      });

      setShowDeleteModal(false);
      setSelectedItems([]);
      fetchSecrets();
    } catch (error) {
      addNotification({
        type: 'error',
        header: 'Failed to delete secrets',
        content: error.message
      });
    }
  };

  const openEditModal = (secret) => {
    setEditingSecret(secret);
    setFormData({
      site_name: secret.site_name,
      site_url: secret.site_url,
      username: secret.username || '',
      password: '', // Don't pre-fill password for security
      additional_fields: secret.additional_fields || {}
    });
    setFormErrors({});
    setShowEditModal(true);
  };

  const openCreateModal = () => {
    setFormData({
      site_name: '',
      site_url: '',
      username: '',
      password: '',
      additional_fields: {}
    });
    setFormErrors({});
    setShowCreateModal(true);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  const columnDefinitions = [
    {
      id: 'site_name',
      header: 'Site Name',
      cell: item => item.site_name,
      sortingField: 'site_name'
    },
    {
      id: 'site_url',
      header: 'Site URL',
      cell: item => (
        <a href={item.site_url} target="_blank" rel="noopener noreferrer">
          {item.site_url.length > 50 ? `${item.site_url.substring(0, 50)}...` : item.site_url}
        </a>
      )
    },
    {
      id: 'username',
      header: 'Username',
      cell: item => item.username || 'N/A'
    },
    {
      id: 'password',
      header: 'Password',
      cell: item => item.password ? '***masked***' : 'N/A'
    },
    {
      id: 'created_at',
      header: 'Created',
      cell: item => formatDate(item.created_at),
      sortingField: 'created_at'
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: item => (
        <ButtonDropdown
          variant="icon"
          ariaLabel={`Actions for ${item.site_name}`}
          items={[
            {
              id: 'edit',
              text: 'Edit',
              iconName: 'edit'
            },
            {
              id: 'delete',
              text: 'Delete',
              iconName: 'remove'
            }
          ]}
          onItemClick={(e) => {
            switch (e.detail.id) {
              case 'edit':
                openEditModal(item);
                break;
              case 'delete':
                setSelectedItems([item]);
                setShowDeleteModal(true);
                break;
              default:
                break;
            }
          }}
          expandToViewport={true}
        />
      ),
      minWidth: 60
    }
  ];

  return (
    <div className="stagger-1">
      {/* Premium Vault Header */}
      <div className="aiva-card" style={{ marginBottom: '3rem', padding: '3rem', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'relative', zIndex: 2 }}>
          <h1 className="stylish-title" style={{ marginBottom: '1rem' }}>Mission Vault</h1>
          <p style={{
            color: '#94a3b8',
            fontSize: '1.2rem',
            maxWidth: '900px',
            lineHeight: '1.6',
            marginBottom: '0'
          }}>
            Securely encrypt and store tactical credentials. AIVA uses these keys to infiltrate complex retail systems and execute missions on your behalf.
          </p>
        </div>

        {/* Decorative elements */}
        <div style={{
          position: 'absolute',
          top: '-100px',
          right: '-100px',
          width: '350px',
          height: '350px',
          background: 'radial-gradient(circle, rgba(16, 185, 129, 0.1) 0%, transparent 70%)',
          borderRadius: '50%'
        }}></div>
      </div>

      <Alert
        type="info"
        header="Security Protocol Active"
        style={{ marginBottom: '2rem', background: 'rgba(15, 23, 42, 0.4)', borderColor: 'var(--glass-border)' }}
      >
        All credentials are protected by hardware-level encryption. AIVA never reveals raw passwords to the interface or external networks.
      </Alert>

      <div className="aiva-card stagger-2" style={{ padding: '2rem' }}>
        <Table
          columnDefinitions={columnDefinitions}
          items={secrets}
          loading={loading}
          selectionType="multi"
          selectedItems={selectedItems}
          onSelectionChange={({ detail }) => setSelectedItems(detail.selectedItems)}
          header={
            <Header
              variant="h2"
              counter={<span className="glow-text-indigo">{secrets.length}</span>}
              actions={
                <SpaceBetween direction="horizontal" size="s">
                  <button className="btn-stylish" style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)' }} onClick={fetchSecrets}>
                    <span className={`material-icons ${loading ? 'rotating' : ''}`} style={{ fontSize: '18px', marginRight: '8px' }}>refresh</span>
                    REFRESH
                  </button>
                  <button className="btn-stylish" onClick={openCreateModal}>
                    <span className="material-icons" style={{ marginRight: '8px' }}>lock</span>
                    ADD NEW SECRET
                  </button>
                  {selectedItems.length > 0 && (
                    <button className="btn-stylish" style={{ background: 'rgba(244, 63, 94, 0.1)', color: '#fb7185' }} onClick={() => setShowDeleteModal(true)}>
                      <span className="material-icons" style={{ marginRight: '8px' }}>delete</span>
                      PURGE ({selectedItems.length})
                    </button>
                  )}
                </SpaceBetween>
              }
            >
              <span style={{ color: 'white' }}>Credential Inventory</span>
            </Header>
          }
          empty={
            <Box textAlign="center" padding="xxl">
              <SpaceBetween size="m">
                <Box variant="h3" color="inherit">Secure Vault Empty</Box>
                <Box variant="p" color="text-body-secondary">Start by adding credentials for your target retailers.</Box>
                <button className="btn-stylish" onClick={openCreateModal}>UPLOAD FIRST SECRET</button>
              </SpaceBetween>
            </Box>
          }
        />
      </div>

      {/* Create Secret Modal */}
      <Modal
        visible={showCreateModal}
        onDismiss={() => setShowCreateModal(false)}
        header="Deploy New Credential"
        footer={
          <Box float="right">
            <SpaceBetween direction="horizontal" size="xs">
              <Button onClick={() => setShowCreateModal(false)}>Cancel</Button>
              <Button variant="primary" onClick={handleCreate}>Confirm Deployment</Button>
            </SpaceBetween>
          </Box>
        }
      >
        <SpaceBetween size="l">
          <div className="aiva-field-group">
            <label className="aiva-field-label">Retailer Name</label>
            <div className="aiva-input-wrapper">
              <Input value={formData.site_name} onChange={({ detail }) => setFormData({ ...formData, site_name: detail.value })} placeholder="e.g. Amazon" />
            </div>
          </div>
          <div className="aiva-field-group">
            <label className="aiva-field-label">Access Endpoint (URL)</label>
            <div className="aiva-input-wrapper">
              <Input value={formData.site_url} onChange={({ detail }) => setFormData({ ...formData, site_url: detail.value })} placeholder="https://..." />
            </div>
          </div>
          <div className="aiva-field-group">
            <label className="aiva-field-label">Agent Username</label>
            <div className="aiva-input-wrapper">
              <Input value={formData.username} onChange={({ detail }) => setFormData({ ...formData, username: detail.value })} placeholder="user@target.com" />
            </div>
          </div>
          <div className="aiva-field-group">
            <label className="aiva-field-label">Access Token (Password)</label>
            <div className="aiva-input-wrapper">
              <Input type="password" value={formData.password} onChange={({ detail }) => setFormData({ ...formData, password: detail.value })} placeholder="Enter secure password" />
            </div>
          </div>
        </SpaceBetween>
      </Modal>

      {/* Edit Secret Modal */}
      <Modal
        visible={showEditModal}
        onDismiss={() => setShowEditModal(false)}
        header={`Reconfigure Secret: ${editingSecret?.site_name}`}
        footer={
          <Box float="right">
            <SpaceBetween direction="horizontal" size="xs">
              <Button onClick={() => setShowEditModal(false)}>Discard changes</Button>
              <Button variant="primary" onClick={handleEdit}>Update Protocol</Button>
            </SpaceBetween>
          </Box>
        }
      >
        <SpaceBetween size="l">
          <div className="aiva-field-group">
            <label className="aiva-field-label">Site Identifier</label>
            <div className="aiva-input-wrapper">
              <Input value={formData.site_name} onChange={({ detail }) => setFormData({ ...formData, site_name: detail.value })} />
            </div>
          </div>
          <div className="aiva-field-group">
            <label className="aiva-field-label">Endpoint</label>
            <div className="aiva-input-wrapper">
              <Input value={formData.site_url} onChange={({ detail }) => setFormData({ ...formData, site_url: detail.value })} />
            </div>
          </div>
          <div className="aiva-field-group">
            <label className="aiva-field-label">Username</label>
            <div className="aiva-input-wrapper">
              <Input value={formData.username} onChange={({ detail }) => setFormData({ ...formData, username: detail.value })} />
            </div>
          </div>
          <div className="aiva-field-group">
            <label className="aiva-field-label">New Access Token</label>
            <div className="aiva-input-wrapper">
              <Input type="password" value={formData.password} onChange={({ detail }) => setFormData({ ...formData, password: detail.value })} placeholder="Leave blank to maintain current" />
            </div>
          </div>
        </SpaceBetween>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={showDeleteModal}
        onDismiss={() => setShowDeleteModal(false)}
        header="Purge Tactical Data"
        footer={
          <Box float="right">
            <SpaceBetween direction="horizontal" size="xs">
              <Button onClick={() => setShowDeleteModal(false)}>Abort</Button>
              <Button variant="primary" onClick={handleDelete}>Confirm Purge</Button>
            </SpaceBetween>
          </Box>
        }
      >
        <SpaceBetween size="m">
          <Box>Are you sure you want to permanently delete {selectedItems.length} secret(s)? This action is irreversible.</Box>
          <Box>
            <strong style={{ display: 'block', marginBottom: '1rem', color: '#fb7185' }}>Targeted for deletion:</strong>
            <ul style={{ color: '#94a3b8' }}>
              {selectedItems.map(item => (
                <li key={item.id}>{item.site_name}</li>
              ))}
            </ul>
          </Box>
        </SpaceBetween>
      </Modal>
    </div>
  );
};

export default SecretVault;
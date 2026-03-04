import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Header,
  SpaceBetween,
  Button,
  Alert,
  FormField,
  FileUpload,
  Select,
  Box,
  ColumnLayout,
  StatusIndicator,
  ProgressBar,
  Table,
  Pagination,
  TextFilter,
  CollectionPreferences,
  Modal,
  Input,
  Textarea,
  Wizard,
  Link
} from '@cloudscape-design/components';
import ModelSelector from '../components/ModelSelector';

const BatchUpload = ({ addNotification }) => {
  const navigate = useNavigate();

  // Main state
  const [currentStep, setCurrentStep] = useState(1);
  const [uploadFile, setUploadFile] = useState([]);
  const [automationMethod, setAutomationMethod] = useState({ value: 'nova_act', label: 'Nova Act + AgentCore Browser' });
  const [aiModel, setAiModel] = useState('nova_act');
  const [userSelectedModel, setUserSelectedModel] = useState(false); // Track if user manually selected a model
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // CSV data state
  const [csvData, setCsvData] = useState([]);
  const [validationResults, setValidationResults] = useState(null);
  const [filteredData, setFilteredData] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);

  // Table state
  const [currentPageIndex, setCurrentPageIndex] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [filterText, setFilterText] = useState('');
  const [sortingColumn, setSortingColumn] = useState({ sortingField: 'name' });

  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [editFormData, setEditFormData] = useState({});

  const automationMethods = [
    { value: 'nova_act', label: 'Nova Act + AgentCore Browser' },
    { value: 'strands', label: 'Strands + AgentCore Browser + Browser Tools' }
  ];

  const columnDefinitions = [
    {
      id: 'name',
      header: 'Product Name',
      cell: item => item.name || '-',
      sortingField: 'name',
      width: 200
    },
    {
      id: 'brand',
      header: 'Brand',
      cell: item => item.brand || '-',
      sortingField: 'brand',
      width: 120
    },
    {
      id: 'price',
      header: 'Price',
      cell: item => {
        const price = parseFloat(item.price);
        return !isNaN(price) ? `$${price.toFixed(2)}` : '-';
      },
      sortingField: 'price',
      width: 100
    },
    {
      id: 'color',
      header: 'Color',
      cell: item => item.color || '-',
      sortingField: 'color',
      width: 100
    },
    {
      id: 'size',
      header: 'Size',
      cell: item => item.size || '-',
      sortingField: 'size',
      width: 100
    },
    {
      id: 'retailer',
      header: 'Retailer',
      cell: item => {
        const retailer = item.detected_retailer || 'unknown';
        const displayName = retailer.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        return displayName;
      },
      sortingField: 'detected_retailer',
      width: 120
    },
    {
      id: 'url',
      header: 'URL',
      cell: item => {
        if (!item.curateditem_url) return '-';

        const truncatedUrl = item.curateditem_url.length > 50
          ? `${item.curateditem_url.substring(0, 50)}...`
          : item.curateditem_url;

        return (
          <Link
            href={item.curateditem_url}
            external
            fontSize="body-s"
          >
            {truncatedUrl}
          </Link>
        );
      },
      width: 200
    },
    {
      id: 'status',
      header: 'Status',
      cell: item => (
        <StatusIndicator type={getValidationStatus(item).type}>
          {getValidationStatus(item).text}
        </StatusIndicator>
      ),
      width: 100
    }
  ];



  const getValidationStatus = (item) => {
    if (!item.name || !item.curateditem_url) {
      return { type: 'error', text: 'Invalid' };
    }
    if (!item.detected_retailer || item.detected_retailer === 'unknown') {
      return { type: 'warning', text: 'Warning' };
    }
    return { type: 'success', text: 'Valid' };
  };

  const detectRetailer = (url) => {
    if (!url) return 'unknown';

    const urlLower = url.toLowerCase();

    // Extract domain from URL for retailer identification
    try {
      const urlObj = new URL(url);
      const domain = urlObj.hostname.replace('www.', '');
      // Use domain as retailer identifier (e.g., "example.com" -> "example")
      const retailer = domain.split('.')[0];
      if (retailer) return retailer;
    } catch (e) {
      // If URL parsing fails, continue to fallback logic
    }

    // Handle affiliate links with murl parameter
    if (urlLower.includes('murl=')) {
      try {
        // Find murl parameter and decode it
        const murlMatch = url.match(/murl=([^&]+)/i);
        if (murlMatch) {
          const decodedUrl = decodeURIComponent(murlMatch[1]).toLowerCase();
          console.log('Decoded URL:', decodedUrl); // Debug log

          if (decodedUrl.includes('neimanmarcus.com')) return 'neiman_marcus';
          if (decodedUrl.includes('net-a-porter.com')) return 'net_a_porter';
          if (decodedUrl.includes('mytheresa.com')) return 'mytheresa';
          if (decodedUrl.includes('amazon.com')) return 'amazon';
        }
      } catch (e) {
        console.warn('Error parsing murl:', e);
      }
    }

    // Handle other affiliate patterns
    if ((urlLower.includes('jdoqocy.com') || urlLower.includes('dpbolvw.net'))) {
      if (urlLower.includes('mytheresa.com')) return 'mytheresa';
      if (urlLower.includes('neimanmarcus.com')) return 'neiman_marcus';
    }

    // Handle linksynergy links
    if (urlLower.includes('linksynergy.com')) {
      if (urlLower.includes('neimanmarcus.com')) return 'neiman_marcus';
      if (urlLower.includes('net-a-porter.com')) return 'net_a_porter';
      if (urlLower.includes('mytheresa.com')) return 'mytheresa';
    }

    return 'unknown';
  };

  const handleFileChange = async ({ detail }) => {
    setUploadFile(detail.value);

    if (detail.value && detail.value.length > 0) {
      try {
        const file = detail.value[0];
        const text = await file.text();
        const lines = text.split('\n').filter(line => line.trim());

        if (lines.length < 2) {
          throw new Error('CSV file must have at least a header and one data row');
        }

        // Proper CSV parsing function
        const parseCSVLine = (line) => {
          const result = [];
          let current = '';
          let inQuotes = false;

          for (let i = 0; i < line.length; i++) {
            const char = line[i];

            if (char === '"') {
              if (inQuotes && line[i + 1] === '"') {
                // Escaped quote
                current += '"';
                i++; // Skip next quote
              } else {
                // Toggle quote state
                inQuotes = !inQuotes;
              }
            } else if (char === ',' && !inQuotes) {
              // End of field
              result.push(current.trim());
              current = '';
            } else {
              current += char;
            }
          }

          // Add the last field
          result.push(current.trim());
          return result;
        };

        const headers = parseCSVLine(lines[0]);
        const data = [];

        for (let i = 1; i < lines.length; i++) {
          const values = parseCSVLine(lines[i]);
          const row = {};

          headers.forEach((header, index) => {
            row[header] = values[index] || '';
          });

          // Add detected retailer
          row.detected_retailer = detectRetailer(row.curateditem_url);
          row.id = i; // Add unique ID for table

          data.push(row);
        }

        setCsvData(data);
        setFilteredData(data);

        // Validation results
        const validRows = data.filter(row => row.name && row.curateditem_url);
        const invalidRows = data.length - validRows.length;
        const unknownRetailers = data.filter(row => row.detected_retailer === 'unknown').length;

        setValidationResults({
          totalRows: data.length,
          validRows: validRows.length,
          invalidRows: invalidRows,
          unknownRetailers: unknownRetailers,
          hasHeader: headers.includes('name') && headers.includes('curateditem_url'),
          fileSize: (file.size / 1024 / 1024).toFixed(2) + ' MB',
          headers: headers
        });

        setCurrentStep(2);

      } catch (error) {
        addNotification({
          type: 'error',
          header: 'CSV Parse Error',
          content: `Failed to parse CSV file: ${error.message}`
        });
      }
    } else {
      setCsvData([]);
      setFilteredData([]);
      setValidationResults(null);
    }
  };

  // Filter and sort data
  useEffect(() => {
    let filtered = csvData;

    if (filterText) {
      filtered = csvData.filter(item =>
        Object.values(item).some(value =>
          String(value).toLowerCase().includes(filterText.toLowerCase())
        )
      );
    }

    if (sortingColumn.sortingField) {
      filtered.sort((a, b) => {
        const aVal = a[sortingColumn.sortingField] || '';
        const bVal = b[sortingColumn.sortingField] || '';

        if (sortingColumn.sortingDescending) {
          return String(bVal).localeCompare(String(aVal));
        }
        return String(aVal).localeCompare(String(bVal));
      });
    }

    setFilteredData(filtered);
  }, [csvData, filterText, sortingColumn]);

  const handleEditItem = (item) => {
    setEditingItem(item);
    setEditFormData({ ...item });
    setShowEditModal(true);
  };

  const handleSaveEdit = () => {
    const updatedData = csvData.map(item =>
      item.id === editingItem.id ? { ...editFormData, detected_retailer: detectRetailer(editFormData.curateditem_url) } : item
    );
    setCsvData(updatedData);
    setShowEditModal(false);
    setEditingItem(null);
    setEditFormData({});
  };

  const handleDeleteItems = () => {
    const updatedData = csvData.filter(item => !selectedItems.find(selected => selected.id === item.id));
    setCsvData(updatedData);
    setSelectedItems([]);
  };

  const handleUpload = async () => {
    if (csvData.length === 0) return;

    setUploading(true);
    setUploadProgress(0);

    try {
      // Create CSV content from current data
      const headers = validationResults.headers;
      const csvContent = [
        headers.join(','),
        ...csvData.map(row => headers.map(header => `"${row[header] || ''}"`).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const formData = new FormData();
      formData.append('file', blob, 'batch_upload.csv');
      formData.append('automation_method', automationMethod.value);
      formData.append('ai_model', aiModel);

      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const response = await fetch('/api/orders/upload-csv', {
        method: 'POST',
        body: formData
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (!response.ok) {
        throw new Error('Failed to upload CSV file');
      }

      const result = await response.json();

      addNotification({
        type: 'success',
        header: 'Batch Upload Completed',
        content: `${result.created_count || 0} orders created successfully${result.error_count > 0 ? ` (${result.error_count} errors)` : ''}`
      });

      // Show errors if any
      if (result.errors && result.errors.length > 0) {
        addNotification({
          type: 'warning',
          header: 'Some Orders Failed',
          content: `${result.error_count} orders failed to create. Check the logs for details.`
        });
      }

      // Navigate back to dashboard
      navigate('/dashboard');

    } catch (error) {
      addNotification({
        type: 'error',
        header: 'Batch Upload Failed',
        content: `Failed to upload CSV: ${error.message}`
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return uploadFile.length > 0;
      case 2:
        return csvData.length > 0;
      case 3:
        return true;
      default:
        return false;
    }
  };

  const getWizardSteps = () => [
    {
      title: "Transmission Payload",
      content: renderStep1()
    },
    {
      title: "Strategic Validation",
      content: renderStep2()
    },
    {
      title: "Mission Launch",
      content: renderStep3()
    }
  ];

  const downloadSampleCSV = () => {
    const link = document.createElement('a');
    link.href = '/sample-orders.csv';
    link.download = 'sample-orders.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderStep1 = () => (
    <div className="aiva-form-section" style={{ border: 'none', background: 'transparent' }}>
      <div className="section-title">
        <div className="section-icon"><span className="material-icons">upload_file</span></div>
        Source Selection
      </div>
      <SpaceBetween size="l">
        <Alert type="info">
          <Box><strong>Required Schema:</strong> name, curateditem_url</Box>
          <Box margin={{ top: 'xs' }}><strong>Optional Data:</strong> brand, description, color, size, price</Box>
        </Alert>

        <div className="aiva-field-group">
          <label className="aiva-field-label">Instructional Blueprint (CSV)</label>
          <FileUpload
            onChange={handleFileChange}
            value={uploadFile}
            i18nStrings={{
              uploadButtonText: e => e ? "Replace Mission File" : "Choose Mission File",
              dropzoneText: e => e ? "Drop files to upload" : "Drop file to upload",
              removeFileAriaLabel: e => `Remove file ${e + 1}`,
              limitShowFewer: "Show fewer files",
              limitShowMore: "Show more files",
              errorIconAriaLabel: "Error",
              warningIconAriaLabel: "Warning"
            }}
            showFileLastModified
            showFileSize
            accept=".csv"
            constraintText="Standard CSV format required, max 10MB payload."
          />
        </div>
      </SpaceBetween>
    </div>
  );

  const renderStep2 = () => (
    <div className="aiva-form-section" style={{ border: 'none', background: 'transparent' }}>
      <div className="section-title">
        <div className="section-icon"><span className="material-icons">visibility</span></div>
        Validation & Intelligence
      </div>
      <SpaceBetween size="m">
        {validationResults && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '1.5rem',
            padding: '1.5rem',
            background: 'rgba(2, 6, 23, 0.4)',
            borderRadius: '16px',
            border: '1px solid var(--glass-border)'
          }}>
            <div>
              <Box variant="small" color="text-body-secondary">TOTAL MISSIONS</Box>
              <Box variant="h3">{validationResults.totalRows}</Box>
            </div>
            <div>
              <Box variant="small" color="text-body-secondary">VALIDATED</Box>
              <StatusIndicator type="success">{validationResults.validRows}</StatusIndicator>
            </div>
            <div>
              <Box variant="small" color="text-body-secondary">ANOMALIES</Box>
              <StatusIndicator type={validationResults.invalidRows > 0 ? "error" : "success"}>
                {validationResults.invalidRows}
              </StatusIndicator>
            </div>
            <div>
              <Box variant="small" color="text-body-secondary">UNKNOWN TARGETS</Box>
              <StatusIndicator type={validationResults.unknownRetailers > 0 ? "warning" : "success"}>
                {validationResults.unknownRetailers}
              </StatusIndicator>
            </div>
          </div>
        )}

        <div className="aiva-card" style={{ padding: '1rem', background: 'rgba(15, 23, 42, 0.4)' }}>
          <Table
            columnDefinitions={columnDefinitions}
            items={filteredData.slice((currentPageIndex - 1) * pageSize, currentPageIndex * pageSize)}
            selectionType="multi"
            selectedItems={selectedItems}
            onSelectionChange={({ detail }) => setSelectedItems(detail.selectedItems)}
            header={
              <Header
                counter={<span className="glow-text-indigo">{filteredData.length}</span>}
                actions={
                  <SpaceBetween direction="horizontal" size="xs">
                    <button className="btn-stylish" style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)' }} disabled={selectedItems.length === 0} onClick={handleDeleteItems}>PURGE SELECTED</button>
                    <button className="btn-stylish" disabled={selectedItems.length !== 1} onClick={() => handleEditItem(selectedItems[0])}>EDIT PARAMETERS</button>
                  </SpaceBetween>
                }
              >
                Infiltration Data
              </Header>
            }
            pagination={
              <Pagination
                currentPageIndex={currentPageIndex}
                pagesCount={Math.ceil(filteredData.length / pageSize)}
                onChange={({ detail }) => setCurrentPageIndex(detail.currentPageIndex)}
              />
            }
          />
        </div>
      </SpaceBetween>
    </div>
  );

  const renderStep3 = () => (
    <div className="aiva-form-section" style={{ border: 'none', background: 'transparent' }}>
      <div className="section-title">
        <div className="section-icon"><span className="material-icons">settings_input_composite</span></div>
        Final Configuration
      </div>
      <SpaceBetween size="l">
        <Alert type="info">Execution parameters will be mirrored across {csvData.length} mission vectors.</Alert>

        <div className="aiva-field-group">
          <label className="aiva-field-label">Automation Strategy</label>
          <div className="aiva-input-wrapper">
            <Select
              selectedOption={automationMethod}
              onChange={({ detail }) => {
                setAutomationMethod(detail.selectedOption);
                if (detail.selectedOption.value === 'nova_act') {
                  setAiModel('nova_act');
                  setUserSelectedModel(false);
                } else if (detail.selectedOption.value === 'strands' && !userSelectedModel) {
                  setAiModel('us.anthropic.claude-sonnet-4-20250514-v1:0');
                }
              }}
              options={automationMethods}
            />
          </div>
        </div>

        {automationMethod.value === 'strands' && (
          <div className="aiva-field-group">
            <label className="aiva-field-label">Intelligence Core</label>
            <div className="aiva-input-wrapper">
              <ModelSelector
                selectedModel={aiModel}
                onChange={(model) => { setAiModel(model); setUserSelectedModel(true); }}
              />
            </div>
          </div>
        )}

        {uploading && (
          <div className="aiva-card" style={{ padding: '2rem' }}>
            <ProgressBar
              value={uploadProgress}
              label={<span className="glow-text-indigo">TRANSMITTING MISSION DATA...</span>}
              description={`${uploadProgress}% complete`}
            />
          </div>
        )}

        <Alert type="warning"><strong>Critical Protocol:</strong> Initiating these {csvData.length} missions will consume system resources and API credits. Verify all target URLs before deployment.</Alert>
      </SpaceBetween>
    </div>
  );

  return (
    <div className="stagger-1">
      {/* Premium Batch Header */}
      <div className="aiva-card" style={{ marginBottom: '2.5rem', padding: '3rem', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'relative', zIndex: 2 }}>
          <h1 className="stylish-title" style={{ marginBottom: '1rem' }}>Fleet Batch Injection</h1>
          <p style={{
            color: '#94a3b8',
            fontSize: '1.2rem',
            maxWidth: '900px',
            lineHeight: '1.6',
            marginBottom: '0'
          }}>
            Deploy massive operations with single-file precision. Upload mission CSVs, validate target integrity, and launch coordinated fleet tasks.
          </p>
        </div>
        <div style={{
          position: 'absolute',
          top: '-100px',
          right: '-100px',
          width: '400px',
          height: '400px',
          background: 'radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, transparent 70%)',
          borderRadius: '50%'
        }}></div>
      </div>

      <div className="aiva-card stagger-2" style={{ padding: '1rem', background: 'transparent', border: 'none' }}>
        <style>{`
          .aiva-wizard-wrapper .awsui_wizard_1sh6m_13u2p_157 {
            background: rgba(15, 23, 42, 0.4) !important;
            backdrop-filter: blur(20px);
            border: 1px solid var(--glass-border);
            border-radius: 24px;
            overflow: hidden;
          }
          .aiva-wizard-wrapper .awsui_navigation_1sh6m_13u2p_221 {
            background: rgba(2, 6, 23, 0.6) !important;
            border-right: 1px solid var(--glass-border);
          }
          .aiva-wizard-wrapper .awsui_content_1sh6m_13u2p_272 {
            padding: 3rem !important;
          }
        `}</style>

        <div className="aiva-wizard-wrapper">
          <Wizard
            i18nStrings={{
              stepNumberLabel: stepNumber => `Phase ${stepNumber}`,
              collapsedStepsLabel: (stepNumber, stepsCount) => `Phase ${stepNumber} of ${stepsCount}`,
              navigationAriaLabel: "Batch deployment protocol",
              cancelButton: "Abort",
              previousButton: "Regress",
              nextButton: "Advance",
              submitButtonText: "INITIALIZE FLEET",
              optional: "optional",
              loadingText: "Transmitting payload..."
            }}
            onNavigate={({ detail }) => {
              const requestedStep = detail.requestedStepIndex + 1;
              if (requestedStep < currentStep || (requestedStep === currentStep + 1 && canProceed())) {
                setCurrentStep(requestedStep);
              }
            }}
            onCancel={() => navigate('/dashboard')}
            onSubmit={handleUpload}
            activeStepIndex={currentStep - 1}
            steps={getWizardSteps()}
            isLoadingNextStep={uploading}
          />
        </div>
      </div>

      {/* Edit Modal */}
      <Modal
        visible={showEditModal}
        onDismiss={() => setShowEditModal(false)}
        header="Refine Mission Parameters"
        footer={
          <Box float="right">
            <SpaceBetween direction="horizontal" size="xs">
              <Button onClick={() => setShowEditModal(false)}>Discard</Button>
              <Button variant="primary" onClick={handleSaveEdit}>Update Mission</Button>
            </SpaceBetween>
          </Box>
        }
      >
        {editingItem && (
          <SpaceBetween size="l">
            <div className="aiva-field-group">
              <label className="aiva-field-label">Target Name</label>
              <div className="aiva-input-wrapper">
                <Input value={editFormData.name || ''} onChange={({ detail }) => setEditFormData(prev => ({ ...prev, name: detail.value }))} />
              </div>
            </div>
            <div className="aiva-field-group">
              <label className="aiva-field-label">Retailer Blueprint (URL)</label>
              <div className="aiva-input-wrapper">
                <Input value={editFormData.curateditem_url || ''} onChange={({ detail }) => setEditFormData(prev => ({ ...prev, curateditem_url: detail.value }))} />
              </div>
            </div>
            <div className="aiva-form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <div className="aiva-field-group">
                <label className="aiva-field-label">Brand</label>
                <div className="aiva-input-wrapper">
                  <Input value={editFormData.brand || ''} onChange={({ detail }) => setEditFormData(prev => ({ ...prev, brand: detail.value }))} />
                </div>
              </div>
              <div className="aiva-field-group">
                <label className="aiva-field-label">Price</label>
                <div className="aiva-input-wrapper">
                  <Input value={editFormData.price || ''} onChange={({ detail }) => setEditFormData(prev => ({ ...prev, price: detail.value }))} type="number" />
                </div>
              </div>
            </div>
          </SpaceBetween>
        )}
      </Modal>
    </div>
  );
};

export default BatchUpload;
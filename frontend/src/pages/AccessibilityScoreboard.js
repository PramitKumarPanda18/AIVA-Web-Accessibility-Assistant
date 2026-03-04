import React from 'react';
import { Container, Header, ColumnLayout, Box, ProgressBar, SpaceBetween } from '@cloudscape-design/components';

const AccessibilityScoreboard = () => {
    const retailers = [
        {
            name: "Amazon",
            score: 98,
            grade: "A+",
            color: "#10b981",
            details: "Clean HTML, high AI-readability, consistent ARIA labels.",
            metrics: [
                { label: "Voice Ordering Compatibility", value: 99 },
                { label: "Visual DOM Clarity", value: 96 },
                { label: "Login Ease", value: 100 }
            ]
        },
        {
            name: "Target",
            score: 87,
            grade: "B+",
            color: "#3b82f6",
            details: "Good structure but frequent popups interupt automated flows.",
            metrics: [
                { label: "Voice Ordering Compatibility", value: 85 },
                { label: "Visual DOM Clarity", value: 90 },
                { label: "Login Ease", value: 88 }
            ]
        },
        {
            name: "Walmart",
            score: 72,
            grade: "C",
            color: "#f59e0b",
            details: "Aggressive anti-bot measures limit some automation capabilities. Complex cart UI.",
            metrics: [
                { label: "Voice Ordering Compatibility", value: 65 },
                { label: "Visual DOM Clarity", value: 75 },
                { label: "Login Ease", value: 78 }
            ]
        },
        {
            name: "Best Buy",
            score: 42,
            grade: "F",
            color: "#ef4444",
            details: "Hidden buttons, broken ARIA roles, and voice-hostile checkout flows.",
            metrics: [
                { label: "Voice Ordering Compatibility", value: 30 },
                { label: "Visual DOM Clarity", value: 50 },
                { label: "Login Ease", value: 45 }
            ]
        }
    ];

    return (
        <SpaceBetween size="l">
            {/* Hero Header */}
            <div className="aiva-card" style={{ padding: '2.5rem', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'relative', zIndex: 2 }}>
                    <h1 className="stylish-title" style={{ marginBottom: '0.5rem' }}>📊 Retailer Accessibility Scoreboard</h1>
                    <p style={{ color: '#94a3b8', fontSize: '1.1rem', maxWidth: '800px', lineHeight: '1.6', margin: 0 }}>
                        A live, global ranking of major e-commerce platforms based on their "AI-Readability" and True Accessibility scores. We guide you toward retailers that respect your setup.
                    </p>
                </div>
                {/* Decorative glows */}
                <div style={{ position: 'absolute', top: '-80px', right: '-80px', width: '250px', height: '250px', background: 'radial-gradient(circle, rgba(16,185,129,0.12) 0%, transparent 70%)', borderRadius: '50%' }}></div>
            </div>

            {/* Scoreboard Content */}
            {retailers.map((store, i) => (
                <div className={`stagger-${(i % 3) + 1}`} key={i}>
                    <Container header={<Header variant="h2">{store.name}</Header>}>
                        <ColumnLayout columns={3}>
                            {/* Score Display */}
                            <Box textAlign="center" padding={{ vertical: 'm' }}>
                                <div style={{ fontSize: '1rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold' }}>Overall Score</div>
                                <div style={{ fontSize: '4rem', fontWeight: '900', color: store.color, lineHeight: '1.1' }}>{store.score}</div>
                                <div style={{ display: 'inline-block', background: `${store.color}22`, color: store.color, padding: '4px 16px', borderRadius: '20px', fontWeight: 'bold', border: `1px solid ${store.color}55`, marginTop: '8px' }}>
                                    Grade: {store.grade}
                                </div>
                            </Box>

                            {/* Details */}
                            <Box padding={{ vertical: 'm' }}>
                                <Box variant="awsui-key-label">Technical Audit Summary</Box>
                                <p style={{ color: '#1e293b', fontSize: '1rem', lineHeight: '1.6', marginTop: '8px' }}>
                                    {store.details}
                                </p>
                            </Box>

                            {/* Deep Metrics */}
                            <Box padding={{ vertical: 'm' }}>
                                <SpaceBetween size="s">
                                    {store.metrics.map((metric, j) => (
                                        <div key={j}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                                <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#64748b' }}>{metric.label}</span>
                                                <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: store.color }}>{metric.value}%</span>
                                            </div>
                                            <div style={{ height: '6px', background: '#e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
                                                <div style={{ width: `${metric.value}%`, height: '100%', background: store.color, borderRadius: '10px' }}></div>
                                            </div>
                                        </div>
                                    ))}
                                </SpaceBetween>
                            </Box>
                        </ColumnLayout>
                    </Container>
                </div>
            ))}
        </SpaceBetween>
    );
};

export default AccessibilityScoreboard;

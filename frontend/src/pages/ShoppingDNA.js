import React, { useState, useEffect } from 'react';
import { Container, Header, ColumnLayout, Box, SpaceBetween, ProgressBar } from '@cloudscape-design/components';

const AnimatedCounter = ({ target, suffix = '' }) => {
    const [count, setCount] = useState(0);
    useEffect(() => {
        let current = 0;
        const step = target / 40;
        const timer = setInterval(() => {
            current += step;
            if (current >= target) { setCount(target); clearInterval(timer); }
            else setCount(Math.round(current * 10) / 10);
        }, 30);
        return () => clearInterval(timer);
    }, [target]);
    return <span>{count}{suffix}</span>;
};

const ShoppingDNA = () => {
    return (
        <SpaceBetween size="l">
            {/* Hero Banner */}
            <div className="aiva-card" style={{ padding: '2.5rem', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'relative', zIndex: 2 }}>
                    <h1 className="stylish-title" style={{ marginBottom: '0.5rem' }}>🧬 Personal Shopping DNA</h1>
                    <p style={{ color: '#94a3b8', fontSize: '1.1rem', maxWidth: '800px', lineHeight: '1.6', margin: 0 }}>
                        A visual representation of your automated shopping habits, accessibility patterns, and how AIVA adapts to your unique needs.
                    </p>
                </div>
                <div style={{ position: 'absolute', top: '-80px', right: '-80px', width: '250px', height: '250px', background: 'radial-gradient(circle, rgba(236,72,153,0.12) 0%, transparent 70%)', borderRadius: '50%' }}></div>
                <div style={{ position: 'absolute', bottom: '-60px', left: '-60px', width: '200px', height: '200px', background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)', borderRadius: '50%' }}></div>
            </div>

            {/* Key Metrics Row */}
            <ColumnLayout columns={4}>
                {[
                    { label: 'Time Saved', value: 14.5, suffix: ' hrs', icon: '⏱️', color: '#10b981', description: 'Automated ordering' },
                    { label: 'Voice Confidence', value: 94, suffix: '%', icon: '🎙️', color: '#6366f1', description: 'Speech accuracy' },
                    { label: 'Orders Completed', value: 47, suffix: '', icon: '📦', color: '#f59e0b', description: 'Total missions' },
                    { label: 'Accessibility Score', value: 96, suffix: '%', icon: '♿', color: '#ec4899', description: 'WCAG compliance' },
                ].map((m, i) => (
                    <Container key={i}>
                        <Box textAlign="center">
                            <div style={{ fontSize: '2rem', marginBottom: '4px' }}>{m.icon}</div>
                            <div style={{ fontSize: '2rem', fontWeight: '800', color: m.color }}>
                                <AnimatedCounter target={m.value} suffix={m.suffix} />
                            </div>
                            <div style={{ fontWeight: '700', fontSize: '0.85rem', color: '#1e293b', marginTop: '4px' }}>{m.label}</div>
                            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{m.description}</div>
                        </Box>
                    </Container>
                ))}
            </ColumnLayout>

            {/* Two Column: Radar + Insights */}
            <ColumnLayout columns={2}>
                {/* Decision Profile Radar */}
                <Container header={<Header variant="h2">🎯 Decision Profile</Header>}>
                    <Box textAlign="center" padding="l">
                        <svg width="280" height="260" viewBox="0 0 200 200">
                            <polygon points="100,10 190,55 190,145 100,190 10,145 10,55" fill="rgba(99, 102, 241, 0.05)" stroke="rgba(99, 102, 241, 0.25)" strokeWidth="1" />
                            <polygon points="100,30 170,65 170,135 100,170 30,135 30,65" fill="rgba(99, 102, 241, 0.05)" stroke="rgba(99, 102, 241, 0.2)" strokeWidth="1" />
                            <polygon points="100,50 150,75 150,125 100,150 50,125 50,75" fill="rgba(99, 102, 241, 0.05)" stroke="rgba(99, 102, 241, 0.15)" strokeWidth="1" />

                            <line x1="100" y1="100" x2="100" y2="10" stroke="rgba(0,0,0,0.08)" />
                            <line x1="100" y1="100" x2="190" y2="55" stroke="rgba(0,0,0,0.08)" />
                            <line x1="100" y1="100" x2="190" y2="145" stroke="rgba(0,0,0,0.08)" />
                            <line x1="100" y1="100" x2="100" y2="190" stroke="rgba(0,0,0,0.08)" />
                            <line x1="100" y1="100" x2="10" y2="145" stroke="rgba(0,0,0,0.08)" />
                            <line x1="100" y1="100" x2="10" y2="55" stroke="rgba(0,0,0,0.08)" />

                            <polygon points="100,20 160,80 180,145 100,150 40,100 80,40" fill="rgba(99, 102, 241, 0.25)" stroke="#6366f1" strokeWidth="2" />

                            <text x="100" y="5" fill="#64748b" fontSize="9" textAnchor="middle" fontWeight="600">Accessibility</text>
                            <text x="198" y="55" fill="#64748b" fontSize="9" textAnchor="start" fontWeight="600">Budget</text>
                            <text x="198" y="150" fill="#64748b" fontSize="9" textAnchor="start" fontWeight="600">Speed</text>
                            <text x="100" y="198" fill="#64748b" fontSize="9" textAnchor="middle" fontWeight="600">Eco-Friendly</text>
                            <text x="2" y="150" fill="#64748b" fontSize="9" textAnchor="end" fontWeight="600">Quality</text>
                            <text x="2" y="55" fill="#64748b" fontSize="9" textAnchor="end" fontWeight="600">Brand Loyalty</text>
                        </svg>
                    </Box>
                </Container>

                {/* Automation Insights */}
                <Container header={<Header variant="h2">🧠 Automation Insights</Header>}>
                    <SpaceBetween size="m">
                        <div>
                            <Box variant="awsui-key-label">Cognitive Load Reduction</Box>
                            <ProgressBar value={82} label="82 clicks & keystrokes avoided" additionalInfo="Using voice commands" />
                        </div>
                        <div>
                            <Box variant="awsui-key-label">Preference Learning</Box>
                            <ProgressBar value={91} label="91% pattern accuracy" additionalInfo="AIVA adapts to your habits" />
                        </div>
                        <div>
                            <Box variant="awsui-key-label">Eco-Friendly Choices</Box>
                            <ProgressBar value={68} label="68% sustainable selections" additionalInfo="Eco-labeled products preferred" />
                        </div>
                        <div>
                            <Box variant="awsui-key-label">Multi-Language Usage</Box>
                            <ProgressBar value={35} label="35% non-English interactions" additionalInfo="Hindi and Spanish detected" />
                        </div>
                    </SpaceBetween>
                </Container>
            </ColumnLayout>

            {/* Personality Summary */}
            <Container header={<Header variant="h2">✨ Your Shopping Personality</Header>}>
                <ColumnLayout columns={3}>
                    {[
                        { title: '🛡️ Safety-First Shopper', score: 'HIGH', desc: 'You prioritize trusted brands and verified sellers. Return policy is always checked before purchase.', color: '#10b981' },
                        { title: '🎯 Precision Buyer', score: 'STRONG', desc: 'You know exactly what you want. Average voice order takes only 45 seconds with minimal corrections.', color: '#6366f1' },
                        { title: '🌱 Eco-Conscious', score: 'MODERATE', desc: 'You frequently select eco-friendly alternatives and prefer minimal-packaging options when available.', color: '#f59e0b' },
                    ].map((p, i) => (
                        <div key={i} style={{ padding: '1.5rem', borderRadius: '12px', border: `1px solid ${p.color}30`, background: `${p.color}08` }}>
                            <div style={{ fontWeight: '700', fontSize: '1rem', marginBottom: '6px', color: '#1e293b' }}>{p.title}</div>
                            <div style={{ fontWeight: '800', fontSize: '0.75rem', color: p.color, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>{p.score}</div>
                            <div style={{ fontSize: '0.85rem', lineHeight: '1.5', color: '#64748b' }}>{p.desc}</div>
                        </div>
                    ))}
                </ColumnLayout>
            </Container>
        </SpaceBetween>
    );
};

export default ShoppingDNA;

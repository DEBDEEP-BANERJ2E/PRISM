---
name: ⚡ Performance Issue
about: Report performance problems or optimization opportunities
title: '[PERFORMANCE] '
labels: ['performance', 'needs-triage']
assignees: ''
---

## ⚡ Performance Issue

### 📋 Issue Summary

A clear and concise description of the performance issue.

### 🎯 Affected Component

**Which part of PRISM is experiencing performance issues?**

- [ ] Web Dashboard
- [ ] Mobile App
- [ ] API Gateway
- [ ] AI/ML Pipeline
- [ ] Alert Management
- [ ] Risk Assessment
- [ ] Digital Twin Rendering
- [ ] Edge Computing
- [ ] Database Queries
- [ ] Real-time Data Processing

### 📊 Performance Metrics

**Current Performance:**
- Response Time: [e.g., 5 seconds]
- Throughput: [e.g., 100 requests/second]
- Memory Usage: [e.g., 2GB]
- CPU Usage: [e.g., 80%]
- Error Rate: [e.g., 5%]

**Expected Performance:**
- Response Time: [e.g., < 1 second]
- Throughput: [e.g., 500 requests/second]
- Memory Usage: [e.g., < 1GB]
- CPU Usage: [e.g., < 50%]
- Error Rate: [e.g., < 1%]

### 🔄 Steps to Reproduce

1. Step 1
2. Step 2
3. Step 3
4. Observe performance issue

### 🌍 Environment

**System Configuration:**
- OS: [e.g., Ubuntu 20.04]
- CPU: [e.g., Intel i7-9700K]
- RAM: [e.g., 16GB]
- Storage: [e.g., SSD 500GB]
- Network: [e.g., 1Gbps]

**PRISM Configuration:**
- Version: [e.g., v1.2.3]
- Deployment: [e.g., Docker, Kubernetes]
- Scale: [e.g., 3 replicas]
- Database: [e.g., PostgreSQL 13]
- Cache: [e.g., Redis 6.2]

**Load Characteristics:**
- Concurrent Users: [e.g., 100]
- Data Volume: [e.g., 1TB]
- Request Rate: [e.g., 1000/min]
- Peak Hours: [e.g., 9AM-5PM]

### 📈 Performance Data

**Monitoring Data (if available):**

```
[Paste relevant performance metrics, logs, or monitoring data]
```

**Profiling Results:**

```
[Paste profiling data if available]
```

### 🔍 Analysis

**Suspected Bottlenecks:**
- [ ] Database queries
- [ ] Network latency
- [ ] CPU-intensive operations
- [ ] Memory leaks
- [ ] Inefficient algorithms
- [ ] Large data transfers
- [ ] Blocking operations
- [ ] Resource contention

**Evidence:**
[Describe any evidence supporting your analysis]

### 💡 Suggested Optimizations

**Potential Solutions:**
- [ ] Database query optimization
- [ ] Caching implementation
- [ ] Code optimization
- [ ] Resource scaling
- [ ] Algorithm improvements
- [ ] Data structure changes
- [ ] Asynchronous processing
- [ ] Load balancing

**Specific Suggestions:**
[Describe specific optimization ideas]

### 📊 Business Impact

**Impact Assessment:**
- [ ] Critical - System unusable during peak times
- [ ] High - Significant user experience degradation
- [ ] Medium - Noticeable but manageable slowdown
- [ ] Low - Minor performance concern

**Affected Users:**
- Number of users affected: [e.g., 500]
- User types affected: [e.g., field operators, administrators]
- Business operations impacted: [e.g., real-time monitoring]

### 🎯 Success Criteria

**Performance Goals:**
- Target response time: [e.g., < 500ms]
- Target throughput: [e.g., 1000 req/sec]
- Target resource usage: [e.g., < 70% CPU]

### 📋 Additional Context

Add any other context, benchmarks, or performance-related information.

### ✅ Checklist

- [ ] I have provided specific performance metrics
- [ ] I have described the environment configuration
- [ ] I have identified the suspected bottleneck
- [ ] I have assessed the business impact
- [ ] I have defined success criteria
import React, { useState, useEffect, useRef } from 'react';
import { motion, useAnimation } from 'framer-motion';
import { gsap } from 'gsap';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Container,
  useTheme,
  alpha,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Avatar,
  Badge,
  Tabs,
  Tab,
  LinearProgress
} from '@mui/material';
import {
  Assessment,
  Download,
  Share,
  Print,
  Email,
  Schedule,
  Visibility,
  Edit,
  Delete,
  Add,
  FilterList,
  Search,
  PictureAsPdf,
  TableChart,
  BarChart,
  Timeline,
  Warning,
  CheckCircle,
  Error,
  Info,
  TrendingUp,
  TrendingDown,
  CalendarToday,
  Person,
  Business
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart as RechartsBarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

interface Report {
  id: string;
  title: string;
  type: 'safety' | 'operational' | 'compliance' | 'incident';
  status: 'draft' | 'pending' | 'approved' | 'published';
  createdBy: string;
  createdDate: string;
  lastModified: string;
  description: string;
  tags: string[];
  priority: 'low' | 'medium' | 'high' | 'critical';
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`reports-tabpanel-${index}`}
      aria-labelledby={`reports-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

const ReportsPage: React.FC = () => {
  const theme = useTheme();
  const [tabValue, setTabValue] = useState(0);
  const [reports, setReports] = useState<Report[]>([]);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const controls = useAnimation();

  // Sample reports data
  const sampleReports: Report[] = [
    {
      id: '1',
      title: 'Monthly Safety Assessment Report',
      type: 'safety',
      status: 'published',
      createdBy: 'Sarah Johnson',
      createdDate: '2024-02-15',
      lastModified: '2024-02-20',
      description: 'Comprehensive safety analysis for February 2024 including risk assessments and incident reports.',
      tags: ['safety', 'monthly', 'assessment'],
      priority: 'high'
    },
    {
      id: '2',
      title: 'Slope Stability Analysis Q1 2024',
      type: 'operational',
      status: 'approved',
      createdBy: 'Mike Chen',
      createdDate: '2024-02-10',
      lastModified: '2024-02-18',
      description: 'Quarterly slope stability analysis covering all active mining sectors.',
      tags: ['slope', 'stability', 'quarterly'],
      priority: 'critical'
    },
    {
      id: '3',
      title: 'Environmental Compliance Report',
      type: 'compliance',
      status: 'pending',
      createdBy: 'Emma Davis',
      createdDate: '2024-02-12',
      lastModified: '2024-02-19',
      description: 'Environmental impact assessment and regulatory compliance status.',
      tags: ['environment', 'compliance', 'regulatory'],
      priority: 'medium'
    },
    {
      id: '4',
      title: 'Rockfall Incident Analysis - Sector 7A',
      type: 'incident',
      status: 'draft',
      createdBy: 'David Wilson',
      createdDate: '2024-02-18',
      lastModified: '2024-02-20',
      description: 'Detailed analysis of rockfall incident in Sector 7A on February 16, 2024.',
      tags: ['incident', 'rockfall', 'sector-7a'],
      priority: 'critical'
    },
    {
      id: '5',
      title: 'Sensor Network Performance Report',
      type: 'operational',
      status: 'published',
      createdBy: 'Lisa Anderson',
      createdDate: '2024-02-08',
      lastModified: '2024-02-14',
      description: 'Analysis of sensor network performance, uptime, and maintenance requirements.',
      tags: ['sensors', 'performance', 'maintenance'],
      priority: 'medium'
    }
  ];

  // Sample chart data
  const monthlyRiskData = [
    { month: 'Jan', risk: 0.35, incidents: 2, sensors: 245 },
    { month: 'Feb', risk: 0.42, incidents: 4, sensors: 247 },
    { month: 'Mar', risk: 0.38, incidents: 1, sensors: 250 },
    { month: 'Apr', risk: 0.45, incidents: 3, sensors: 252 },
    { month: 'May', risk: 0.52, incidents: 5, sensors: 255 },
    { month: 'Jun', risk: 0.48, incidents: 3, sensors: 258 }
  ];

  const reportTypeDistribution = [
    { name: 'Safety', value: 35, color: theme.palette.error.main },
    { name: 'Operational', value: 28, color: theme.palette.primary.main },
    { name: 'Compliance', value: 22, color: theme.palette.warning.main },
    { name: 'Incident', value: 15, color: theme.palette.info.main }
  ];

  useEffect(() => {
    setReports(sampleReports);
    
    // Animated background
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        const documents: Array<{
          x: number;
          y: number;
          vx: number;
          vy: number;
          size: number;
          opacity: number;
          rotation: number;
          rotationSpeed: number;
        }> = [];

        // Create floating document icons
        for (let i = 0; i < 15; i++) {
          documents.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            vx: (Math.random() - 0.5) * 0.2,
            vy: (Math.random() - 0.5) * 0.2,
            size: Math.random() * 20 + 10,
            opacity: Math.random() * 0.3 + 0.1,
            rotation: Math.random() * Math.PI * 2,
            rotationSpeed: (Math.random() - 0.5) * 0.02
          });
        }

        const animate = () => {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          
          documents.forEach(doc => {
            doc.x += doc.vx;
            doc.y += doc.vy;
            doc.rotation += doc.rotationSpeed;

            if (doc.x < 0 || doc.x > canvas.width) doc.vx *= -1;
            if (doc.y < 0 || doc.y > canvas.height) doc.vy *= -1;

            ctx.save();
            ctx.translate(doc.x, doc.y);
            ctx.rotate(doc.rotation);
            ctx.globalAlpha = doc.opacity;
            
            // Draw document shape
            ctx.fillStyle = theme.palette.primary.main;
            ctx.fillRect(-doc.size/2, -doc.size/2, doc.size, doc.size * 1.3);
            
            // Draw document lines
            ctx.strokeStyle = theme.palette.background.default;
            ctx.lineWidth = 1;
            for (let i = 0; i < 3; i++) {
              ctx.beginPath();
              ctx.moveTo(-doc.size/3, -doc.size/3 + i * doc.size/4);
              ctx.lineTo(doc.size/3, -doc.size/3 + i * doc.size/4);
              ctx.stroke();
            }
            
            ctx.restore();
          });

          requestAnimationFrame(animate);
        };

        animate();
      }
    }

    controls.start("visible");
  }, [controls, theme]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'success';
      case 'approved': return 'info';
      case 'pending': return 'warning';
      case 'draft': return 'default';
      default: return 'default';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'safety': return <Warning />;
      case 'operational': return <Assessment />;
      case 'compliance': return <CheckCircle />;
      case 'incident': return <Error />;
      default: return <Info />;
    }
  };

  const filteredReports = reports.filter(report => {
    const matchesType = filterType === 'all' || report.type === filterType;
    const matchesSearch = report.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         report.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesType && matchesSearch;
  });

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 100
      }
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100%',
        position: 'relative',
        background: `
          radial-gradient(circle at 20% 80%, ${alpha(theme.palette.primary.main, 0.1)} 0%, transparent 50%),
          radial-gradient(circle at 80% 20%, ${alpha(theme.palette.secondary.main, 0.1)} 0%, transparent 50%)
        `
      }}
    >
      {/* Animated Background Canvas */}
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 0
        }}
      />

      <Container maxWidth="xl" sx={{ position: 'relative', zIndex: 1, py: 4 }}>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <Box mb={4} textAlign="center">
            <Typography
              variant="h3"
              fontWeight="bold"
              gutterBottom
              sx={{
                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}
            >
              Reports & Analytics
            </Typography>
            <Typography variant="h6" color="text.secondary">
              Comprehensive safety and operational reporting
            </Typography>
          </Box>
        </motion.div>

        {/* Controls */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate={controls}
        >
          <Card
            sx={{
              mb: 4,
              background: alpha(theme.palette.background.paper, 0.8),
              backdropFilter: 'blur(20px)',
              border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`
            }}
          >
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
                <Tabs value={tabValue} onChange={handleTabChange}>
                  <Tab icon={<Assessment />} label="Overview" />
                  <Tab icon={<TableChart />} label="Reports" />
                  <Tab icon={<BarChart />} label="Analytics" />
                  <Tab icon={<Schedule />} label="Scheduled" />
                </Tabs>
                
                <Box display="flex" gap={2} alignItems="center">
                  <TextField
                    size="small"
                    placeholder="Search reports..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    InputProps={{
                      startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />
                    }}
                  />
                  
                  <FormControl size="small" sx={{ minWidth: 120 }}>
                    <InputLabel>Type</InputLabel>
                    <Select
                      value={filterType}
                      label="Type"
                      onChange={(e) => setFilterType(e.target.value)}
                    >
                      <MenuItem value="all">All Types</MenuItem>
                      <MenuItem value="safety">Safety</MenuItem>
                      <MenuItem value="operational">Operational</MenuItem>
                      <MenuItem value="compliance">Compliance</MenuItem>
                      <MenuItem value="incident">Incident</MenuItem>
                    </Select>
                  </FormControl>
                  
                  <Button
                    variant="contained"
                    startIcon={<Add />}
                    onClick={() => setDialogOpen(true)}
                  >
                    New Report
                  </Button>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </motion.div>

        {/* Tab Panels */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate={controls}
        >
          {/* Overview Tab */}
          <TabPanel value={tabValue} index={0}>
            <Grid container spacing={3}>
              {/* Stats Cards */}
              <Grid item xs={12} md={3}>
                <motion.div variants={itemVariants}>
                  <Card
                    sx={{
                      background: alpha(theme.palette.background.paper, 0.8),
                      backdropFilter: 'blur(20px)',
                      border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`
                    }}
                  >
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Assessment sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
                      <Typography variant="h4" fontWeight="bold">
                        {reports.length}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Total Reports
                      </Typography>
                    </CardContent>
                  </Card>
                </motion.div>
              </Grid>

              <Grid item xs={12} md={3}>
                <motion.div variants={itemVariants}>
                  <Card
                    sx={{
                      background: alpha(theme.palette.background.paper, 0.8),
                      backdropFilter: 'blur(20px)',
                      border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`
                    }}
                  >
                    <CardContent sx={{ textAlign: 'center' }}>
                      <CheckCircle sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
                      <Typography variant="h4" fontWeight="bold">
                        {reports.filter(r => r.status === 'published').length}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Published
                      </Typography>
                    </CardContent>
                  </Card>
                </motion.div>
              </Grid>

              <Grid item xs={12} md={3}>
                <motion.div variants={itemVariants}>
                  <Card
                    sx={{
                      background: alpha(theme.palette.background.paper, 0.8),
                      backdropFilter: 'blur(20px)',
                      border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`
                    }}
                  >
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Warning sx={{ fontSize: 40, color: 'warning.main', mb: 1 }} />
                      <Typography variant="h4" fontWeight="bold">
                        {reports.filter(r => r.priority === 'critical').length}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Critical Priority
                      </Typography>
                    </CardContent>
                  </Card>
                </motion.div>
              </Grid>

              <Grid item xs={12} md={3}>
                <motion.div variants={itemVariants}>
                  <Card
                    sx={{
                      background: alpha(theme.palette.background.paper, 0.8),
                      backdropFilter: 'blur(20px)',
                      border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`
                    }}
                  >
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Schedule sx={{ fontSize: 40, color: 'info.main', mb: 1 }} />
                      <Typography variant="h4" fontWeight="bold">
                        3
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Scheduled
                      </Typography>
                    </CardContent>
                  </Card>
                </motion.div>
              </Grid>

              {/* Charts */}
              <Grid item xs={12} md={8}>
                <motion.div variants={itemVariants}>
                  <Card
                    sx={{
                      background: alpha(theme.palette.background.paper, 0.8),
                      backdropFilter: 'blur(20px)',
                      border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                      height: 400
                    }}
                  >
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Monthly Risk Trends
                      </Typography>
                      <ResponsiveContainer width="100%" height={320}>
                        <AreaChart data={monthlyRiskData}>
                          <defs>
                            <linearGradient id="riskGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={theme.palette.error.main} stopOpacity={0.8}/>
                              <stop offset="95%" stopColor={theme.palette.error.main} stopOpacity={0.1}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke={alpha(theme.palette.text.primary, 0.1)} />
                          <XAxis dataKey="month" stroke={theme.palette.text.secondary} />
                          <YAxis stroke={theme.palette.text.secondary} />
                          <RechartsTooltip
                            contentStyle={{
                              backgroundColor: alpha(theme.palette.background.paper, 0.9),
                              border: `1px solid ${alpha(theme.palette.primary.main, 0.3)}`,
                              borderRadius: 8
                            }}
                          />
                          <Area
                            type="monotone"
                            dataKey="risk"
                            stroke={theme.palette.error.main}
                            fillOpacity={1}
                            fill="url(#riskGradient)"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </motion.div>
              </Grid>

              <Grid item xs={12} md={4}>
                <motion.div variants={itemVariants}>
                  <Card
                    sx={{
                      background: alpha(theme.palette.background.paper, 0.8),
                      backdropFilter: 'blur(20px)',
                      border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                      height: 400
                    }}
                  >
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Report Types
                      </Typography>
                      <ResponsiveContainer width="100%" height={320}>
                        <PieChart>
                          <Pie
                            data={reportTypeDistribution}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={120}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {reportTypeDistribution.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <RechartsTooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </motion.div>
              </Grid>
            </Grid>
          </TabPanel>

          {/* Reports Tab */}
          <TabPanel value={tabValue} index={1}>
            <motion.div variants={itemVariants}>
              <TableContainer
                component={Paper}
                sx={{
                  background: alpha(theme.palette.background.paper, 0.8),
                  backdropFilter: 'blur(20px)',
                  border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`
                }}
              >
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Report</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Priority</TableCell>
                      <TableCell>Created By</TableCell>
                      <TableCell>Date</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredReports.map((report) => (
                      <TableRow key={report.id} hover>
                        <TableCell>
                          <Box>
                            <Typography variant="subtitle2" fontWeight="bold">
                              {report.title}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {report.description}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip
                            icon={getTypeIcon(report.type)}
                            label={report.type}
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={report.status}
                            size="small"
                            color={getStatusColor(report.status) as any}
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={report.priority}
                            size="small"
                            color={getPriorityColor(report.priority) as any}
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={1}>
                            <Avatar sx={{ width: 24, height: 24 }}>
                              {report.createdBy.charAt(0)}
                            </Avatar>
                            <Typography variant="body2">
                              {report.createdBy}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {new Date(report.createdDate).toLocaleDateString()}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box display="flex" gap={1}>
                            <Tooltip title="View Report">
                              <IconButton size="small" color="primary">
                                <Visibility />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Download PDF">
                              <IconButton size="small" color="secondary">
                                <PictureAsPdf />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Share">
                              <IconButton size="small" color="info">
                                <Share />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </motion.div>
          </TabPanel>

          {/* Analytics Tab */}
          <TabPanel value={tabValue} index={2}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <motion.div variants={itemVariants}>
                  <Card
                    sx={{
                      background: alpha(theme.palette.background.paper, 0.8),
                      backdropFilter: 'blur(20px)',
                      border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                      height: 400
                    }}
                  >
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Report Generation Trends
                      </Typography>
                      <ResponsiveContainer width="100%" height={320}>
                        <RechartsBarChart data={monthlyRiskData}>
                          <CartesianGrid strokeDasharray="3 3" stroke={alpha(theme.palette.text.primary, 0.1)} />
                          <XAxis dataKey="month" stroke={theme.palette.text.secondary} />
                          <YAxis stroke={theme.palette.text.secondary} />
                          <RechartsTooltip
                            contentStyle={{
                              backgroundColor: alpha(theme.palette.background.paper, 0.9),
                              border: `1px solid ${alpha(theme.palette.primary.main, 0.3)}`,
                              borderRadius: 8
                            }}
                          />
                          <Legend />
                          <Bar dataKey="incidents" fill={theme.palette.error.main} name="Incidents" />
                          <Bar dataKey="sensors" fill={theme.palette.primary.main} name="Sensor Reports" />
                        </RechartsBarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </motion.div>
              </Grid>
            </Grid>
          </TabPanel>

          {/* Scheduled Tab */}
          <TabPanel value={tabValue} index={3}>
            <motion.div variants={itemVariants}>
              <Card
                sx={{
                  background: alpha(theme.palette.background.paper, 0.8),
                  backdropFilter: 'blur(20px)',
                  border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`
                }}
              >
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Scheduled Reports
                  </Typography>
                  <List>
                    <ListItem>
                      <ListItemIcon>
                        <CalendarToday color="primary" />
                      </ListItemIcon>
                      <ListItemText
                        primary="Weekly Safety Summary"
                        secondary="Every Monday at 9:00 AM"
                      />
                      <Chip label="Active" color="success" size="small" />
                    </ListItem>
                    <Divider />
                    <ListItem>
                      <ListItemIcon>
                        <Assessment color="info" />
                      </ListItemIcon>
                      <ListItemText
                        primary="Monthly Risk Assessment"
                        secondary="First day of each month at 8:00 AM"
                      />
                      <Chip label="Active" color="success" size="small" />
                    </ListItem>
                    <Divider />
                    <ListItem>
                      <ListItemIcon>
                        <Business color="warning" />
                      </ListItemIcon>
                      <ListItemText
                        primary="Quarterly Compliance Report"
                        secondary="First day of each quarter at 10:00 AM"
                      />
                      <Chip label="Pending" color="warning" size="small" />
                    </ListItem>
                  </List>
                </CardContent>
              </Card>
            </motion.div>
          </TabPanel>
        </motion.div>

        {/* New Report Dialog */}
        <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle>Create New Report</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Report Title"
                  variant="outlined"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Report Type</InputLabel>
                  <Select label="Report Type">
                    <MenuItem value="safety">Safety</MenuItem>
                    <MenuItem value="operational">Operational</MenuItem>
                    <MenuItem value="compliance">Compliance</MenuItem>
                    <MenuItem value="incident">Incident</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Priority</InputLabel>
                  <Select label="Priority">
                    <MenuItem value="low">Low</MenuItem>
                    <MenuItem value="medium">Medium</MenuItem>
                    <MenuItem value="high">High</MenuItem>
                    <MenuItem value="critical">Critical</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Description"
                  variant="outlined"
                  multiline
                  rows={4}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button variant="contained" onClick={() => setDialogOpen(false)}>
              Create Report
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
};

export default ReportsPage;
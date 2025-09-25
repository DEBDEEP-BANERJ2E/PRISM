import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  Typography,
  Avatar,
  Menu,
  MenuItem,
  Divider,
  Badge,
  Tooltip,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard,
  Assessment,
  Sensors,
  Warning,
  Analytics,
  ViewInAr,
  Science,
  Description,
  Settings,
  Person,
  Logout,
  Notifications,
  Home,
  Terrain,
  Upload
} from '@mui/icons-material';
import { useAuthStore } from '../../store/authStore';

const drawerWidth = 280;

import { useWorkflowStore } from '../../store/workflowStore';
import WorkflowNavigation from '../workflow/WorkflowNavigation';

const navigationItems = [
  { path: '/app/home', label: 'Home', icon: Home },
  { path: '/app/dashboard', label: 'Dashboard', icon: Dashboard },
  { 
    path: '/app/data-input', 
    label: 'Data Input', 
    icon: Upload,
    workflowStep: 'data-input' as const
  },
  { 
    path: '/app/model-config', 
    label: 'Model Configuration', 
    icon: Settings,
    workflowStep: 'model-config' as const
  },
  { 
    path: '/app/analytics', 
    label: 'Analytics', 
    icon: Analytics,
    workflowStep: 'analytics' as const
  },
  { 
    path: '/app/reports', 
    label: 'Reports', 
    icon: Description,
    workflowStep: 'reports' as const
  },
  { 
    path: '/app/scenario', 
    label: 'Scenario Planning', 
    icon: Science,
    workflowStep: 'scenario' as const
  },
  { 
    path: '/app/risk', 
    label: 'Risk Assessment', 
    icon: Assessment,
    workflowStep: 'risk-assessment' as const
  },
  { path: '/app/sensors', label: 'Sensor Management', icon: Sensors },
  { path: '/app/alerts', label: 'Alerts', icon: Warning },
  { path: '/app/notifications', label: 'Notifications', icon: Notifications },
  { path: '/app/digital-twin', label: 'Digital Twin', icon: ViewInAr }
];

const MainLayout: React.FC = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [showWorkflowNav, setShowWorkflowNav] = useState(false);
  
  const { user, logout } = useAuthStore();
  
  // Safely get workflow store with fallbacks
  const workflowStore = useWorkflowStore();
  const canNavigateToStep = workflowStore?.canNavigateToStep || (() => true);
  const addNotification = workflowStore?.addNotification || (() => {});
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Check if current path is part of workflow
  const isWorkflowPath = navigationItems.some(
    item => item.workflowStep && item.path === location.pathname
  );

  useEffect(() => {
    // Temporarily disable workflow navigation to prevent errors
    setShowWorkflowNav(false);
  }, [isWorkflowPath]);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
    handleProfileMenuClose();
  };

  const handleNavigation = (path: string, workflowStep?: string) => {
    // Simplified navigation - temporarily disable workflow guards
    navigate(path);
    if (isMobile) {
      setMobileOpen(false);
    }
  };

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Logo */}
      <Box
        sx={{
          p: 3,
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
        }}
      >
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #00ff88, #00cc6a)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <Terrain sx={{ color: 'white', fontSize: 24 }} />
        </Box>
        <Box>
          <Typography variant="h6" fontWeight="bold">
            PRISM
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Safety Management
          </Typography>
        </Box>
      </Box>

      {/* Workflow Navigation */}
      {showWorkflowNav && (
        <Box sx={{ px: 2, py: 1 }}>
          <React.Suspense fallback={<div>Loading workflow...</div>}>
            <WorkflowNavigation compact={true} showProgress={true} />
          </React.Suspense>
        </Box>
      )}

      {/* Navigation */}
      <List sx={{ flex: 1, px: 2, py: 1 }}>
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          const isDisabled = false; // Temporarily disable workflow restrictions
          
          return (
            <ListItem key={item.path} disablePadding sx={{ mb: 0.5 }}>
              <Tooltip
                title={
                  isDisabled 
                    ? 'Complete previous workflow steps to unlock'
                    : item.label
                }
                placement="right"
              >
                <ListItemButton
                  onClick={() => handleNavigation(item.path, item.workflowStep)}
                  disabled={isDisabled}
                  sx={{
                    borderRadius: 2,
                    py: 1.5,
                    px: 2,
                    backgroundColor: isActive ? 'rgba(0, 255, 136, 0.1)' : 'transparent',
                    border: isActive ? '1px solid rgba(0, 255, 136, 0.3)' : '1px solid transparent',
                    opacity: isDisabled ? 0.5 : 1,
                    '&:hover': {
                      backgroundColor: isDisabled ? 'transparent' : 'rgba(0, 255, 136, 0.05)',
                      border: isDisabled ? '1px solid transparent' : '1px solid rgba(0, 255, 136, 0.2)'
                    },
                    '&.Mui-disabled': {
                      opacity: 0.5
                    }
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 40 }}>
                    <Icon
                      sx={{
                        color: isActive ? 'primary.main' : isDisabled ? 'text.disabled' : 'text.secondary',
                        fontSize: 22
                      }}
                    />
                  </ListItemIcon>
                  <ListItemText
                    primary={item.label}
                    sx={{
                      '& .MuiListItemText-primary': {
                        fontSize: '0.9rem',
                        fontWeight: isActive ? 600 : 400,
                        color: isActive ? 'primary.main' : isDisabled ? 'text.disabled' : 'text.primary'
                      }
                    }}
                  />
                </ListItemButton>
              </Tooltip>
            </ListItem>
          );
        })}
      </List>

      {/* User Info */}
      <Box sx={{ p: 2, borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            p: 2,
            borderRadius: 2,
            backgroundColor: 'rgba(255, 255, 255, 0.05)'
          }}
        >
          <Avatar
            src={user?.avatar}
            sx={{
              width: 40,
              height: 40,
              bgcolor: 'primary.main'
            }}
          >
            {user?.name?.charAt(0)}
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="subtitle2" noWrap>
              {user?.name}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap>
              {user?.role?.replace('_', ' ')}
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* App Bar */}
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
          backgroundColor: 'rgba(26, 26, 26, 0.9)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: 'none'
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            {navigationItems.find(item => item.path === location.pathname)?.label || 'PRISM'}
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Tooltip title="Notifications">
              <IconButton color="inherit">
                <Badge badgeContent={3} color="error">
                  <Notifications />
                </Badge>
              </IconButton>
            </Tooltip>

            <Tooltip title="Settings">
              <IconButton color="inherit" onClick={() => navigate('/app/settings')}>
                <Settings />
              </IconButton>
            </Tooltip>

            <Tooltip title="Profile">
              <IconButton onClick={handleProfileMenuOpen} sx={{ ml: 1 }}>
                <Avatar
                  src={user?.avatar}
                  sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}
                >
                  {user?.name?.charAt(0)}
                </Avatar>
              </IconButton>
            </Tooltip>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Profile Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleProfileMenuClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem onClick={() => { navigate('/app/profile'); handleProfileMenuClose(); }}>
          <ListItemIcon>
            <Person fontSize="small" />
          </ListItemIcon>
          Profile
        </MenuItem>
        <MenuItem onClick={() => { navigate('/app/settings'); handleProfileMenuClose(); }}>
          <ListItemIcon>
            <Settings fontSize="small" />
          </ListItemIcon>
          Settings
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleLogout}>
          <ListItemIcon>
            <Logout fontSize="small" />
          </ListItemIcon>
          Logout
        </MenuItem>
      </Menu>

      {/* Navigation Drawer */}
      <Box
        component="nav"
        sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
              backgroundColor: 'background.paper',
              borderRight: '1px solid rgba(255, 255, 255, 0.1)'
            }
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
              backgroundColor: 'background.paper',
              borderRight: '1px solid rgba(255, 255, 255, 0.1)'
            }
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { md: `calc(100% - ${drawerWidth}px)` },
          height: '100vh',
          backgroundColor: 'background.default',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <Toolbar />
        <Box
          sx={{
            flex: 1,
            overflow: 'auto',
            height: 'calc(100vh - 64px)'
          }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              style={{ height: '100%' }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </Box>
      </Box>
    </Box>
  );
};

export default MainLayout;
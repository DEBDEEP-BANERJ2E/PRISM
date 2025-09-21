import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Box,
  Container,
  useTheme,
  alpha,
  useMediaQuery,
  Collapse
} from '@mui/material';
import {
  Menu as MenuIcon,
  Close as CloseIcon,
  PlayArrow,
  Assessment,
  ExpandLess,
  ExpandMore,
  Home,
  Info,
  AttachMoney,
  Login,
  ContactMail
} from '@mui/icons-material';

interface NavigationItem {
  label: string;
  path?: string;
  action?: () => void;
  icon?: React.ReactElement;
  children?: NavigationItem[];
}

interface ResponsiveNavigationProps {
  onDemoRequest?: () => void;
  onBriefDownload?: () => void;
}

const ResponsiveNavigation: React.FC<ResponsiveNavigationProps> = ({
  onDemoRequest,
  onBriefDownload
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      const isScrolled = window.scrollY > 50;
      setScrolled(isScrolled);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navigationItems: NavigationItem[] = [
    {
      label: 'Home',
      path: '/',
      icon: <Home />
    },
    {
      label: 'Solution',
      icon: <Info />,
      children: [
        { label: 'How It Works', path: '/#how-it-works' },
        { label: 'Features', path: '/#features' },
        { label: 'Technology', path: '/#technology' }
      ]
    },
    {
      label: 'Company',
      icon: <Info />,
      children: [
        { label: 'About Us', path: '/#team' },
        { label: 'Case Studies', path: '/case-studies' },
        { label: 'Partners', path: '/#partners' }
      ]
    },
    {
      label: 'Pricing',
      path: '/pricing',
      icon: <AttachMoney />
    },
    {
      label: 'Resources',
      icon: <Assessment />,
      children: [
        { 
          label: 'Download Brief', 
          action: onBriefDownload || (() => navigate('/brief'))
        },
        { label: 'Technical Docs', path: '/docs' },
        { label: 'ROI Calculator', path: '/roi-calculator' }
      ]
    }
  ];

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleItemClick = (item: NavigationItem) => {
    if (item.action) {
      item.action();
    } else if (item.path) {
      if (item.path.startsWith('/#')) {
        // Handle anchor links
        const element = document.querySelector(item.path.substring(2));
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      } else {
        navigate(item.path);
      }
    }
    
    if (isMobile) {
      setMobileOpen(false);
    }
  };

  const handleExpandClick = (label: string) => {
    setExpandedItems(prev => 
      prev.includes(label) 
        ? prev.filter(item => item !== label)
        : [...prev, label]
    );
  };

  const renderNavigationItem = (item: NavigationItem, isNested = false) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.includes(item.label);

    return (
      <React.Fragment key={item.label}>
        <ListItem
          button
          onClick={() => {
            if (hasChildren) {
              handleExpandClick(item.label);
            } else {
              handleItemClick(item);
            }
          }}
          sx={{
            pl: isNested ? 4 : 2,
            '&:hover': {
              backgroundColor: alpha(theme.palette.primary.main, 0.1)
            }
          }}
        >
          {item.icon && (
            <ListItemIcon sx={{ color: theme.palette.primary.main }}>
              {item.icon}
            </ListItemIcon>
          )}
          <ListItemText 
            primary={item.label}
            sx={{
              '& .MuiListItemText-primary': {
                fontWeight: isNested ? 400 : 500
              }
            }}
          />
          {hasChildren && (
            isExpanded ? <ExpandLess /> : <ExpandMore />
          )}
        </ListItem>
        
        {hasChildren && (
          <Collapse in={isExpanded} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {item.children!.map(child => renderNavigationItem(child, true))}
            </List>
          </Collapse>
        )}
      </React.Fragment>
    );
  };

  const drawer = (
    <Box sx={{ width: 280 }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          p: 2,
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`
        }}
      >
        <Typography
          variant="h6"
          fontWeight="bold"
          sx={{
            background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}
        >
          PRISM
        </Typography>
        <IconButton onClick={handleDrawerToggle} aria-label="Close navigation menu">
          <CloseIcon />
        </IconButton>
      </Box>
      
      <List>
        {navigationItems.map(item => renderNavigationItem(item))}
      </List>
      
      <Box sx={{ p: 2, mt: 'auto' }}>
        <Button
          fullWidth
          variant="contained"
          startIcon={<PlayArrow />}
          onClick={() => {
            if (onDemoRequest) {
              onDemoRequest();
            } else {
              navigate('/app/dashboard');
            }
            setMobileOpen(false);
          }}
          sx={{
            mb: 2,
            background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
            '&:hover': {
              background: `linear-gradient(135deg, ${theme.palette.primary.light} 0%, ${theme.palette.primary.main} 100%)`
            }
          }}
        >
          Request Demo
        </Button>
        
        <Button
          fullWidth
          variant="outlined"
          startIcon={<Login />}
          onClick={() => {
            navigate('/login');
            setMobileOpen(false);
          }}
          sx={{
            borderColor: theme.palette.primary.main,
            color: theme.palette.primary.main,
            '&:hover': {
              backgroundColor: alpha(theme.palette.primary.main, 0.1)
            }
          }}
        >
          Login
        </Button>
      </Box>
    </Box>
  );

  return (
    <>
      <AppBar
        position="fixed"
        elevation={scrolled ? 4 : 0}
        sx={{
          background: scrolled 
            ? alpha(theme.palette.background.paper, 0.95)
            : alpha(theme.palette.background.paper, 0.9),
          backdropFilter: 'blur(20px)',
          borderBottom: `1px solid ${alpha(theme.palette.primary.main, scrolled ? 0.2 : 0.1)}`,
          transition: 'all 0.3s ease-in-out'
        }}
      >
        <Container maxWidth="lg">
          <Toolbar sx={{ px: { xs: 0, sm: 2 } }}>
            {/* Logo */}
            <Typography
              variant="h5"
              component="button"
              onClick={() => navigate('/')}
              sx={{
                fontWeight: 'bold',
                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                border: 'none',
                backgroundColor: 'transparent',
                cursor: 'pointer',
                flexGrow: 0,
                mr: 4
              }}
              aria-label="PRISM home"
            >
              PRISM
            </Typography>

            {/* Desktop Navigation */}
            {!isMobile && (
              <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
                <Box sx={{ display: 'flex', gap: 1, flexGrow: 1 }}>
                  {navigationItems.map((item) => (
                    <Button
                      key={item.label}
                      color="inherit"
                      onClick={() => handleItemClick(item)}
                      sx={{ 
                        color: 'text.primary',
                        textTransform: 'none',
                        fontWeight: 500,
                        '&:hover': {
                          backgroundColor: alpha(theme.palette.primary.main, 0.1)
                        }
                      }}
                    >
                      {item.label}
                    </Button>
                  ))}
                </Box>

                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                  <Button
                    color="inherit"
                    startIcon={<Assessment />}
                    onClick={onBriefDownload || (() => navigate('/brief'))}
                    sx={{ 
                      color: 'text.primary',
                      textTransform: 'none'
                    }}
                  >
                    Download Brief
                  </Button>
                  
                  <Button
                    variant="contained"
                    startIcon={<PlayArrow />}
                    onClick={onDemoRequest || (() => navigate('/app/dashboard'))}
                    sx={{
                      background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                      textTransform: 'none',
                      '&:hover': {
                        background: `linear-gradient(135deg, ${theme.palette.primary.light} 0%, ${theme.palette.primary.main} 100%)`
                      }
                    }}
                  >
                    Request Demo
                  </Button>
                  
                  <Button
                    variant="outlined"
                    startIcon={<Login />}
                    onClick={() => navigate('/login')}
                    sx={{
                      borderColor: theme.palette.primary.main,
                      color: theme.palette.primary.main,
                      textTransform: 'none',
                      '&:hover': {
                        backgroundColor: alpha(theme.palette.primary.main, 0.1)
                      }
                    }}
                  >
                    Login
                  </Button>
                </Box>
              </Box>
            )}

            {/* Mobile Menu Button */}
            {isMobile && (
              <Box sx={{ ml: 'auto' }}>
                <IconButton
                  color="inherit"
                  aria-label="Open navigation menu"
                  edge="start"
                  onClick={handleDrawerToggle}
                  sx={{ color: 'text.primary' }}
                >
                  <MenuIcon />
                </IconButton>
              </Box>
            )}
          </Toolbar>
        </Container>
      </AppBar>

      {/* Mobile Drawer */}
      <Drawer
        variant="temporary"
        anchor="right"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{
          keepMounted: true // Better open performance on mobile
        }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: 280,
            background: alpha(theme.palette.background.paper, 0.95),
            backdropFilter: 'blur(20px)'
          }
        }}
      >
        {drawer}
      </Drawer>

      {/* Spacer for fixed AppBar */}
      <Toolbar />
    </>
  );
};

export default ResponsiveNavigation;
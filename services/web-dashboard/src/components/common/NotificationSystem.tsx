import React from 'react';
import {
  Snackbar,
  Alert,
  AlertTitle,
  Button,
  Box,
  IconButton,
  Slide,
  SlideProps
} from '@mui/material';
import { Close } from '@mui/icons-material';
import { useWorkflowStore } from '../../store/workflowStore';

function SlideTransition(props: SlideProps) {
  return <Slide {...props} direction="left" />;
}

const NotificationSystem: React.FC = () => {
  const { notifications, removeNotification } = useWorkflowStore();

  const handleClose = (id: string) => {
    removeNotification(id);
  };

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 80,
        right: 16,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
        maxWidth: 400,
        width: '100%'
      }}
    >
      {notifications.map((notification, index) => (
        <Snackbar
          key={notification.id}
          open={true}
          TransitionComponent={SlideTransition}
          sx={{
            position: 'relative',
            transform: `translateY(${index * 80}px)`,
            transition: 'transform 0.3s ease-in-out'
          }}
        >
          <Alert
            severity={notification.type}
            variant="filled"
            sx={{
              width: '100%',
              '& .MuiAlert-message': {
                width: '100%'
              }
            }}
            action={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {notification.actions?.map((action, actionIndex) => (
                  <Button
                    key={actionIndex}
                    size="small"
                    variant="outlined"
                    onClick={action.action}
                    sx={{
                      color: 'inherit',
                      borderColor: 'currentColor',
                      '&:hover': {
                        borderColor: 'currentColor',
                        backgroundColor: 'rgba(255, 255, 255, 0.1)'
                      }
                    }}
                  >
                    {action.label}
                  </Button>
                ))}
                <IconButton
                  size="small"
                  onClick={() => handleClose(notification.id)}
                  sx={{ color: 'inherit' }}
                >
                  <Close fontSize="small" />
                </IconButton>
              </Box>
            }
          >
            <AlertTitle>{notification.title}</AlertTitle>
            {notification.message}
          </Alert>
        </Snackbar>
      ))}
    </Box>
  );
};

export default NotificationSystem;
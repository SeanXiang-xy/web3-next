import { ConnectButton } from '@rainbow-me/rainbowkit';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { AppBar, Toolbar, Typography, Button, Box, Container, Paper } from '@mui/material';

const Layout = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position="static" color="default" elevation={1}>
        <Container maxWidth="lg">
          <Toolbar disableGutters sx={{ justifyContent: 'space-between' }}>
            <Typography 
              variant="h6" 
              component={Link} 
              href="/" 
              sx={{ 
                textDecoration: 'none', 
                color: 'primary.main',
                fontWeight: 'bold'
              }}
            >
              Web3 Demo
            </Typography>
            
            <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 1 }}>
               <Button 
                 component={Link} 
                 href="/wagmi" 
                 color={router.pathname === '/wagmi' ? 'primary' : 'inherit'}
                 sx={{
                   transition: 'all 0.3s ease',
                   '&:hover': {
                     transform: 'translateY(-2px)',
                     boxShadow: 2
                   }
                 }}
               >
                 Wagmi
               </Button>
               <Button 
                 component={Link} 
                 href="/ethers" 
                 color={router.pathname === '/ethers' ? 'primary' : 'inherit'}
                 sx={{
                   transition: 'all 0.3s ease',
                   '&:hover': {
                     transform: 'translateY(-2px)',
                     boxShadow: 2
                   }
                 }}
               >
                 Ethers.js
               </Button>
               <Button 
                 component={Link} 
                 href="/viem" 
                 color={router.pathname === '/viem' ? 'primary' : 'inherit'}
                 sx={{
                   transition: 'all 0.3s ease',
                   '&:hover': {
                     transform: 'translateY(-2px)',
                     boxShadow: 2
                   }
                 }}
               >
                 Viem
               </Button>
             </Box>
            
            <Box sx={{ ml: 2 }}>
            <ConnectButton 
              chainStatus="none"
              showBalance={false}
              accountStatus="avatar"
            />
          </Box>
          </Toolbar>
        </Container>
      </AppBar>
      
      <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
        <Container maxWidth="lg">
          <Paper elevation={2} sx={{ p: 3 }}>
            {children}
          </Paper>
        </Container>
      </Box>
      
      <Box component="footer" sx={{ py: 3, borderTop: 1, borderColor: 'divider' }}>
        <Container maxWidth="lg">
          <Typography variant="body2" color="text.secondary" align="center">
            Web3 Demo App - 2025
          </Typography>
        </Container>
      </Box>
    </Box>
   );
};

export default Layout;

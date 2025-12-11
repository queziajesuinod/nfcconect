import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Tags from "./pages/Tags";
import Users from "./pages/Users";
import Logs from "./pages/Logs";
import Links from "./pages/Links";
import NfcRegister from "./pages/NfcRegister";
import LinkRedirect from "./pages/LinkRedirect";
import Checkins from "./pages/Checkins";
import Schedules from "./pages/Schedules";

function Router() {
  return (
    <Switch>
      {/* Public Routes */}
      <Route path="/" component={Home} />
      <Route path="/nfc" component={NfcRegister} />
      <Route path="/l/:shortCode" component={LinkRedirect} />
      
      {/* Dashboard Routes (Protected) */}
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/dashboard/tags" component={Tags} />
      <Route path="/dashboard/users" component={Users} />
      <Route path="/dashboard/logs" component={Logs} />
      <Route path="/dashboard/links" component={Links} />
      <Route path="/dashboard/checkins" component={Checkins} />
      <Route path="/dashboard/schedules" component={Schedules} />
      
      {/* Fallback */}
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;

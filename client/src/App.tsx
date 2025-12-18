import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider } from "./contexts/AuthContext";
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
import UserApp from "./pages/UserApp";
import RealtimePanel from "./pages/RealtimePanel";
import CheckinHistory from "./pages/CheckinHistory";
import Groups from "./pages/Groups";
import GroupDetails from "./pages/GroupDetails";
import { Login } from "./pages/Login";
import Register from "./pages/Register";
import { ProtectedRoute } from "./components/ProtectedRoute";
import EvolutionIntegration from "./pages/EvolutionIntegration";
import Disparos from "./pages/Disparos";

function Router() {
  return (
    <Switch>
      {/* Public Routes */}
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/nfc" component={NfcRegister} />
      <Route path="/l/:shortCode" component={LinkRedirect} />
      <Route path="/app" component={UserApp} />
      
      {/* Dashboard Routes (Protected) */}
      <Route path="/dashboard">
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      </Route>
      <Route path="/dashboard/tags">
        <ProtectedRoute>
          <Tags />
        </ProtectedRoute>
      </Route>
      <Route path="/dashboard/users">
        <ProtectedRoute>
          <Users />
        </ProtectedRoute>
      </Route>
      <Route path="/dashboard/logs">
        <ProtectedRoute>
          <Logs />
        </ProtectedRoute>
      </Route>
      <Route path="/dashboard/links">
        <ProtectedRoute>
          <Links />
        </ProtectedRoute>
      </Route>
      <Route path="/dashboard/checkins">
        <ProtectedRoute>
          <Checkins />
        </ProtectedRoute>
      </Route>
      <Route path="/dashboard/checkins/history">
        <ProtectedRoute>
          <CheckinHistory />
        </ProtectedRoute>
      </Route>
      <Route path="/dashboard/schedules">
        <ProtectedRoute>
          <Schedules />
        </ProtectedRoute>
      </Route>
      <Route path="/dashboard/realtime">
        <ProtectedRoute>
          <RealtimePanel />
        </ProtectedRoute>
      </Route>
      <Route path="/dashboard/groups">
        <ProtectedRoute>
          <Groups />
        </ProtectedRoute>
      </Route>
      <Route path="/dashboard/groups/:id">
        <ProtectedRoute>
          <GroupDetails />
        </ProtectedRoute>
      </Route>
      <Route path="/dashboard/evolution">
        <ProtectedRoute>
          <EvolutionIntegration />
        </ProtectedRoute>
      </Route>
      <Route path="/dashboard/disparos">
        <ProtectedRoute>
          <Disparos />
        </ProtectedRoute>
      </Route>
      
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
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;

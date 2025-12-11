import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { 
  MapPin, 
  Download, 
  CheckCircle, 
  XCircle, 
  Loader2, 
  Wifi, 
  WifiOff,
  RefreshCw,
  Smartphone,
  Bell,
  Navigation
} from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import { useSearch } from "wouter";
import { toast } from "sonner";

interface LocationState {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  timestamp: Date | null;
  error: string | null;
}

interface SyncState {
  lastSync: Date | null;
  syncing: boolean;
  error: string | null;
}

export default function UserApp() {
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const tagUid = params.get("uid");

  const [isInstalled, setIsInstalled] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [locationPermission, setLocationPermission] = useState<PermissionState | null>(null);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [autoSync, setAutoSync] = useState(false);
  const [syncInterval, setSyncInterval] = useState<NodeJS.Timeout | null>(null);

  const [location, setLocation] = useState<LocationState>({
    latitude: null,
    longitude: null,
    accuracy: null,
    timestamp: null,
    error: null,
  });

  const [syncState, setSyncState] = useState<SyncState>({
    lastSync: null,
    syncing: false,
    error: null,
  });

  const updateLocationMutation = trpc.userLocation.update.useMutation({
    onSuccess: () => {
      setSyncState(prev => ({
        ...prev,
        lastSync: new Date(),
        syncing: false,
        error: null,
      }));
      toast.success("Localização atualizada!");
    },
    onError: (error) => {
      setSyncState(prev => ({
        ...prev,
        syncing: false,
        error: error.message,
      }));
      toast.error("Erro ao sincronizar: " + error.message);
    },
  });

  // Check if PWA is installed
  useEffect(() => {
    const checkInstalled = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isIOSStandalone = (window.navigator as any).standalone === true;
      setIsInstalled(isStandalone || isIOSStandalone);
    };
    checkInstalled();

    // Listen for install prompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // Listen for app installed
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setInstallPrompt(null);
      toast.success("App instalado com sucesso!");
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  // Register service worker
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('SW registered:', registration);
          setSwRegistration(registration);

          // Listen for messages from SW
          navigator.serviceWorker.addEventListener('message', (event) => {
            if (event.data.type === 'LOCATION_SYNCED') {
              setSyncState(prev => ({
                ...prev,
                lastSync: new Date(event.data.timestamp),
                syncing: false,
              }));
            }
          });
        })
        .catch((error) => {
          console.error('SW registration failed:', error);
        });
    }
  }, []);

  // Check permissions
  useEffect(() => {
    if ('permissions' in navigator) {
      navigator.permissions.query({ name: 'geolocation' })
        .then((result) => {
          setLocationPermission(result.state);
          result.addEventListener('change', () => {
            setLocationPermission(result.state);
          });
        });
    }

    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  // Online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Store user data in SW when tagUid is available
  useEffect(() => {
    if (tagUid && swRegistration?.active) {
      swRegistration.active.postMessage({
        type: 'STORE_USER_DATA',
        userData: {
          tagUid,
          deviceInfo: navigator.userAgent,
        },
      });
    }
  }, [tagUid, swRegistration]);

  // Get current location
  const getCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocation(prev => ({ ...prev, error: 'Geolocalização não suportada' }));
      return;
    }

    setLocation(prev => ({ ...prev, error: null }));

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: Math.round(position.coords.accuracy),
          timestamp: new Date(position.timestamp),
          error: null,
        });
      },
      (error) => {
        let errorMsg = 'Erro ao obter localização';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMsg = 'Permissão de localização negada';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMsg = 'Localização indisponível';
            break;
          case error.TIMEOUT:
            errorMsg = 'Tempo esgotado ao obter localização';
            break;
        }
        setLocation(prev => ({ ...prev, error: errorMsg }));
        toast.error(errorMsg);
      },
      {
        enableHighAccuracy: true,
        timeout: 30000,
        maximumAge: 0,
      }
    );
  }, []);

  // Sync location to server
  const syncLocation = useCallback(() => {
    if (!tagUid) {
      toast.error("UID da tag não encontrado");
      return;
    }

    if (!location.latitude || !location.longitude) {
      toast.error("Obtenha sua localização primeiro");
      return;
    }

    setSyncState(prev => ({ ...prev, syncing: true }));

    updateLocationMutation.mutate({
      tagUid,
      latitude: location.latitude.toString(),
      longitude: location.longitude.toString(),
      accuracy: location.accuracy || undefined,
      deviceInfo: navigator.userAgent,
    });
  }, [tagUid, location, updateLocationMutation]);

  // Auto-sync toggle
  const toggleAutoSync = useCallback(() => {
    if (autoSync) {
      // Stop auto-sync
      if (syncInterval) {
        clearInterval(syncInterval);
        setSyncInterval(null);
      }
      setAutoSync(false);
      toast.info("Sincronização automática desativada");
    } else {
      // Start auto-sync (every 5 minutes)
      getCurrentLocation();
      const interval = setInterval(() => {
        getCurrentLocation();
        // Sync after getting location
        setTimeout(() => {
          if (location.latitude && location.longitude && tagUid) {
            syncLocation();
          }
        }, 2000);
      }, 5 * 60 * 1000); // 5 minutes
      
      setSyncInterval(interval);
      setAutoSync(true);
      toast.success("Sincronização automática ativada (a cada 5 min)");
    }
  }, [autoSync, syncInterval, getCurrentLocation, location, tagUid, syncLocation]);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (syncInterval) {
        clearInterval(syncInterval);
      }
    };
  }, [syncInterval]);

  // Install PWA
  const handleInstall = async () => {
    if (!installPrompt) return;
    
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setInstallPrompt(null);
    }
  };

  // Request notification permission
  const requestNotifications = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      if (permission === 'granted') {
        toast.success("Notificações ativadas!");
      }
    }
  };

  // Register periodic sync
  const registerPeriodicSync = async () => {
    if (!swRegistration) return;

    try {
      // @ts-ignore - Periodic Sync API
      if ('periodicSync' in swRegistration) {
        // @ts-ignore
        await swRegistration.periodicSync.register('update-location', {
          minInterval: 15 * 60 * 1000, // 15 minutes minimum
        });
        toast.success("Sincronização periódica ativada!");
      } else {
        toast.info("Seu navegador não suporta sincronização periódica em segundo plano");
      }
    } catch (error) {
      console.error('Periodic sync registration failed:', error);
      toast.error("Não foi possível ativar sincronização periódica");
    }
  };

  if (!tagUid) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <Card className="border-4 border-black max-w-md w-full">
          <CardContent className="py-12 text-center">
            <XCircle className="w-16 h-16 mx-auto mb-4 text-red-600" />
            <h2 className="text-2xl font-black mb-2">TAG NÃO IDENTIFICADA</h2>
            <p className="text-gray-600">
              Acesse esta página através do link da sua tag NFC.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b-4 border-black p-4">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-black flex items-center justify-center">
              <MapPin className="w-6 h-6 text-white" />
            </div>
            <span className="font-black text-xl">NFC CHECK-IN</span>
          </div>
          <div className="flex items-center gap-2">
            {isOnline ? (
              <Wifi className="w-5 h-5 text-green-600" />
            ) : (
              <WifiOff className="w-5 h-5 text-red-600" />
            )}
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto p-4 space-y-4">
        {/* Install Card */}
        {!isInstalled && installPrompt && (
          <Card className="border-4 border-black bg-yellow-50">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Smartphone className="w-5 h-5" />
                INSTALAR APP
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm mb-3">
                Instale o app para check-in automático em segundo plano.
              </p>
              <Button 
                onClick={handleInstall}
                className="w-full bg-black text-white font-bold"
              >
                <Download className="w-5 h-5 mr-2" />
                INSTALAR AGORA
              </Button>
            </CardContent>
          </Card>
        )}

        {isInstalled && (
          <Card className="border-4 border-green-600 bg-green-50">
            <CardContent className="py-4 flex items-center gap-3">
              <CheckCircle className="w-6 h-6 text-green-600" />
              <span className="font-bold text-green-800">App instalado!</span>
            </CardContent>
          </Card>
        )}

        {/* Tag Info */}
        <Card className="border-4 border-black">
          <CardContent className="py-4">
            <p className="text-sm text-gray-600">Tag vinculada:</p>
            <p className="font-mono font-bold text-lg">{tagUid}</p>
          </CardContent>
        </Card>

        {/* Location Card */}
        <Card className="border-4 border-black">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <Navigation className="w-5 h-5" />
              SUA LOCALIZAÇÃO
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {location.error ? (
              <div className="bg-red-50 border-2 border-red-600 p-3">
                <p className="text-red-800 font-medium">{location.error}</p>
              </div>
            ) : location.latitude ? (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-600">Latitude:</span>
                    <p className="font-mono font-bold">{location.latitude.toFixed(6)}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Longitude:</span>
                    <p className="font-mono font-bold">{location.longitude?.toFixed(6)}</p>
                  </div>
                </div>
                <div className="text-sm">
                  <span className="text-gray-600">Precisão: </span>
                  <span className="font-bold">{location.accuracy}m</span>
                </div>
                {location.timestamp && (
                  <div className="text-sm text-gray-600">
                    Atualizado: {location.timestamp.toLocaleTimeString('pt-BR')}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-gray-600">Clique no botão abaixo para obter sua localização</p>
            )}

            <Button 
              onClick={getCurrentLocation}
              variant="outline"
              className="w-full border-2 border-black font-bold"
            >
              <MapPin className="w-5 h-5 mr-2" />
              OBTER LOCALIZAÇÃO
            </Button>
          </CardContent>
        </Card>

        {/* Sync Card */}
        <Card className="border-4 border-black">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5" />
              SINCRONIZAÇÃO
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {syncState.lastSync && (
              <div className="bg-green-50 border-2 border-green-600 p-3">
                <p className="text-green-800 text-sm">
                  Última sincronização: {syncState.lastSync.toLocaleTimeString('pt-BR')}
                </p>
              </div>
            )}

            {syncState.error && (
              <div className="bg-red-50 border-2 border-red-600 p-3">
                <p className="text-red-800 text-sm">{syncState.error}</p>
              </div>
            )}

            <Button 
              onClick={syncLocation}
              disabled={!location.latitude || syncState.syncing}
              className="w-full bg-black text-white font-bold"
            >
              {syncState.syncing ? (
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-5 h-5 mr-2" />
              )}
              SINCRONIZAR AGORA
            </Button>

            <Button 
              onClick={toggleAutoSync}
              variant={autoSync ? "default" : "outline"}
              className={`w-full font-bold ${autoSync ? "bg-green-600 hover:bg-green-700" : "border-2 border-black"}`}
            >
              {autoSync ? (
                <>
                  <CheckCircle className="w-5 h-5 mr-2" />
                  AUTO-SYNC ATIVO (5 min)
                </>
              ) : (
                <>
                  <RefreshCw className="w-5 h-5 mr-2" />
                  ATIVAR AUTO-SYNC
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Permissions Card */}
        <Card className="border-4 border-black">
          <CardHeader className="pb-2">
            <CardTitle>PERMISSÕES</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-medium">Localização</span>
              {locationPermission === 'granted' ? (
                <span className="text-green-600 font-bold flex items-center gap-1">
                  <CheckCircle className="w-4 h-4" /> Permitido
                </span>
              ) : locationPermission === 'denied' ? (
                <span className="text-red-600 font-bold flex items-center gap-1">
                  <XCircle className="w-4 h-4" /> Negado
                </span>
              ) : (
                <span className="text-yellow-600 font-bold">Pendente</span>
              )}
            </div>

            <div className="flex items-center justify-between">
              <span className="font-medium">Notificações</span>
              {notificationPermission === 'granted' ? (
                <span className="text-green-600 font-bold flex items-center gap-1">
                  <CheckCircle className="w-4 h-4" /> Permitido
                </span>
              ) : notificationPermission === 'denied' ? (
                <span className="text-red-600 font-bold flex items-center gap-1">
                  <XCircle className="w-4 h-4" /> Negado
                </span>
              ) : (
                <Button 
                  onClick={requestNotifications}
                  size="sm"
                  variant="outline"
                  className="border-2 border-black"
                >
                  <Bell className="w-4 h-4 mr-1" />
                  Ativar
                </Button>
              )}
            </div>

            {isInstalled && swRegistration && (
              <Button 
                onClick={registerPeriodicSync}
                variant="outline"
                className="w-full border-2 border-black font-bold mt-2"
              >
                ATIVAR SYNC EM SEGUNDO PLANO
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card className="border-4 border-gray-300">
          <CardContent className="py-4">
            <h3 className="font-bold mb-2">Como funciona:</h3>
            <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
              <li>Instale o app no seu celular</li>
              <li>Permita acesso à localização</li>
              <li>Ative a sincronização automática</li>
              <li>Quando estiver no local, sua presença será registrada automaticamente</li>
            </ol>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

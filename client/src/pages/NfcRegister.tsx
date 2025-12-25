import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { Nfc, CheckCircle, ArrowRight, Loader2, AlertCircle, MapPin } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useSearch } from "wouter";
import { toast } from "sonner";

interface GeoLocation {
  latitude: string;
  longitude: string;
  accuracy: number;
}

interface SessionData {
  exists: boolean;
  tag: { id: number; name?: string | null; uid?: string | null } | null;
  user: {
    id: number;
    name?: string | null;
    email?: string | null;
    phone?: string | null;
    deviceId?: string | null;
  } | null;
  redirectUrl: string | null;
}

// Generate or retrieve unique device ID
function getDeviceId(): string {
  const DEVICE_ID_KEY = "nfc_device_id";
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId = crypto.randomUUID
      ? crypto.randomUUID()
      : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
          const r = Math.random() * 16 | 0;
          const v = c === "x" ? r : (r & 0x3) | 0x8;
          return v.toString(16);
        });
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
}

export default function NfcRegister() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const tagUid = params.get("uid") || "";

  const [lookupValue, setLookupValue] = useState("");
  const [lookupResult, setLookupResult] = useState<SessionData | null>(null);
  const [lookupAttempted, setLookupAttempted] = useState(false);
  const [guestRedirectUrl, setGuestRedirectUrl] = useState<string | null>(null);
  const [isGuestRedirecting, setIsGuestRedirecting] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [location, setLocation] = useState<GeoLocation | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [checkinDone, setCheckinDone] = useState(false);
  const [checkinAttempted, setCheckinAttempted] = useState(false);
  const [autoCheckinStatus, setAutoCheckinStatus] = useState<
    "pending" | "success" | "failed" | "no-schedule"
  >("pending");

  const deviceId = getDeviceId();
  const autoCheckinTriggered = useRef(false);

  // Check if user already exists for this tag AND device
  const { data: checkData, isLoading: isChecking, error: checkError } =
    trpc.nfcUsers.checkByTagUid.useQuery(
      { tagUid, deviceId },
      { enabled: !!tagUid && !!deviceId }
    );

  const sessionData = (checkData?.exists
    ? checkData
    : lookupResult?.exists
    ? lookupResult
    : null) as SessionData | null;

  const redirectToDestination = (target?: string | null) => {
    const destination = target || sessionData?.redirectUrl || guestRedirectUrl;
    if (destination) {
      setTimeout(() => {
        window.location.href = destination;
      }, 2000);
    }
  };

  // Check if there's an active schedule for this tag
  const { data: scheduleData } = trpc.checkins.getActiveSchedule.useQuery(
    { tagId: sessionData?.tag?.id || 0 },
    { enabled: !!sessionData?.tag?.id }
  );

  const lookupMemberMutation = trpc.nfcUsers.lookupMember.useMutation({
    onSuccess: (data) => {
      setLookupAttempted(true);
      setLookupResult(data as SessionData);
      if (data.exists) {
        toast.success("Cadastro encontrado!");
      } else {
        toast.info("Cadastro nao encontrado.");
      }
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const guestRegisterMutation = trpc.nfcUsers.register.useMutation({
    onSuccess: (data) => {
      toast.success("Acesso como convidado registrado!");
      if (data.redirectUrl) {
        setGuestRedirectUrl(data.redirectUrl);
        setIsGuestRedirecting(true);
        setTimeout(() => {
          window.location.href = data.redirectUrl!;
        }, 1500);
      } else {
        setIsGuestRedirecting(true);
      }
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const manualCheckinMutation = trpc.checkins.manualCheckin.useMutation({
    onSuccess: (result) => {
      setCheckinDone(true);
      setAutoCheckinStatus("success");
      if (result.isWithinRadius) {
        toast.success(
          `Check-in realizado! VocÇ¦ estÇ­ a ${result.distanceMeters}m (dentro do raio)`
        );
      } else {
        toast.warning(
          `Check-in registrado! VocÇ¦ estÇ­ a ${result.distanceMeters}m (fora do raio)`
        );
      }
      // Auto-redirect after successful check-in
      redirectToDestination(result.activatedLink?.targetUrl);
    },
    onError: (error) => {
      setAutoCheckinStatus("failed");
      // If check-in fails (e.g., already checked in), still redirect
      if (error.message.includes("jÇ­ fez check-in")) {
        toast.info("VocÇ¦ jÇ­ fez check-in hoje!");
        setCheckinDone(true);
        if (sessionData?.redirectUrl) {
          setTimeout(() => {
            window.location.href = sessionData.redirectUrl!;
          }, 1500);
        }
      } else {
        toast.error(error.message);
      }
    },
  });

  // Request geolocation on mount for existing users
  useEffect(() => {
    if (sessionData?.exists && tagUid && !location && !locationError) {
      requestLocation();
    }
  }, [sessionData, tagUid, location, locationError]);

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setLocationError("GeolocalizaÇõÇœo nÇœo suportada neste navegador");
      return;
    }

    setIsGettingLocation(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude.toString(),
          longitude: position.coords.longitude.toString(),
          accuracy: position.coords.accuracy,
        });
        setIsGettingLocation(false);
      },
      (error) => {
        setIsGettingLocation(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setLocationError("PermissÇœo de localizaÇõÇœo negada");
            break;
          case error.POSITION_UNAVAILABLE:
            setLocationError("LocalizaÇõÇœo indisponÇðvel");
            break;
          case error.TIMEOUT:
            setLocationError("Tempo esgotado ao obter localizaÇõÇœo");
            break;
          default:
            setLocationError("Erro ao obter localizaÇõÇœo");
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  // AUTO CHECK-IN: When user exists, has location, and there's an active schedule
  useEffect(() => {
    if (
      sessionData?.exists &&
      sessionData?.tag?.id &&
      sessionData?.user?.id &&
      location &&
      scheduleData?.hasActiveSchedule &&
      !checkinAttempted &&
      !autoCheckinTriggered.current
    ) {
      autoCheckinTriggered.current = true;
      setCheckinAttempted(true);

      // Trigger automatic check-in
      manualCheckinMutation.mutate({
        tagId: sessionData.tag.id,
        nfcUserId: sessionData.user.id,
        latitude: location.latitude,
        longitude: location.longitude,
      });
    }
  }, [sessionData, location, scheduleData, checkinAttempted, manualCheckinMutation]);

  // If no active schedule, redirect directly
  useEffect(() => {
    if (
      sessionData?.exists &&
      sessionData?.redirectUrl &&
      scheduleData !== undefined &&
      !scheduleData?.hasActiveSchedule &&
      !checkinAttempted
    ) {
      setAutoCheckinStatus("no-schedule");
      setIsRedirecting(true);
      const timer = setTimeout(() => {
        window.location.href = sessionData.redirectUrl!;
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [sessionData, scheduleData, checkinAttempted]);

  const handleLookupSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const identifier = lookupValue.trim();
    if (!tagUid) {
      toast.error("UID da tag nÇœo encontrado");
      return;
    }
    if (!identifier) {
      toast.error("Informe CPF, telefone ou email.");
      return;
    }
    lookupMemberMutation.mutate({
      tagUid,
      deviceId,
      identifier,
      userAgent: navigator.userAgent,
      deviceInfo: `${navigator.platform} - ${navigator.language}`,
    });
  };

  const handleGuestContinue = () => {
    if (!tagUid) {
      toast.error("UID da tag nÇœo encontrado");
      return;
    }
    guestRegisterMutation.mutate({
      tagUid,
      deviceId,
      userAgent: navigator.userAgent,
      deviceInfo: `${navigator.platform} - ${navigator.language}`,
    });
  };

  const handleMemberRegister = () => {
    if (!tagUid) {
      toast.error("UID da tag nÇœo encontrado");
      return;
    }

    const trimmed = lookupValue.trim();
    const digits = trimmed.replace(/\D/g, "");
    const params = new URLSearchParams();
    params.set("uid", tagUid);
    params.set("device", deviceId);
    if (trimmed.includes("@")) {
      params.set("email", trimmed);
    }
    if (digits) {
      params.set("telefone", digits);
    }

    window.location.href = `/member-register?${params.toString()}`;
  };

  const handleRedirect = () => {
    const destination = sessionData?.redirectUrl || guestRedirectUrl;
    if (destination) {
      window.location.href = destination;
    }
  };

  // No UID provided
  if (!tagUid) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="border-4 border-black p-8 md:p-12 brutal-shadow max-w-md w-full text-center">
          <div className="w-20 h-20 bg-red-600 flex items-center justify-center mx-auto mb-6">
            <Nfc className="w-12 h-12 text-white" />
          </div>
          <h2 className="mb-4">Tag InvÇ­lida</h2>
          <p className="text-gray-600">
            Nenhum identificador de tag NFC foi encontrado.
            Por favor, escaneie uma tag vÇ­lida.
          </p>
        </div>
      </div>
    );
  }

  // Loading - checking if user exists
  if (isChecking) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-20 h-20 bg-black flex items-center justify-center mx-auto mb-6">
            <Loader2 className="w-12 h-12 text-white animate-spin" />
          </div>
          <h2 className="mb-2">Verificando...</h2>
          <p className="text-gray-500">Aguarde um momento</p>
        </div>
      </div>
    );
  }

  // Error checking tag
  if (checkError) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="border-4 border-black p-8 md:p-12 brutal-shadow max-w-md w-full text-center">
          <div className="w-20 h-20 bg-red-600 flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-12 h-12 text-white" />
          </div>
          <h2 className="mb-4">Erro</h2>
          <p className="text-gray-600">
            {checkError.message || "NÇœo foi possÇðvel verificar esta tag."}
          </p>
        </div>
      </div>
    );
  }

  // User exists - Processing check-in and redirect
  if (sessionData?.exists) {
    // Getting location for check-in
    if (isGettingLocation || (!location && !locationError)) {
      return (
        <div className="min-h-screen bg-white flex items-center justify-center p-4">
          <div className="text-center">
            <div className="w-20 h-20 bg-blue-600 flex items-center justify-center mx-auto mb-6">
              <MapPin className="w-12 h-12 text-white animate-pulse" />
            </div>
            <h2 className="mb-2">Obtendo localizaÇõÇœo...</h2>
            <p className="text-gray-500">
              {sessionData.user?.name ? `OlÇ­, ${sessionData.user.name}!` : "Bem-vindo de volta!"}
            </p>
            <p className="text-sm text-gray-400 mt-2">Permita o acesso Çÿ sua localizaÇõÇœo</p>
          </div>
        </div>
      );
    }

    // Location error - show option to continue without check-in
    if (locationError && !checkinDone) {
      return (
        <div className="min-h-screen bg-white flex items-center justify-center p-4">
          <div className="border-4 border-black p-8 md:p-12 brutal-shadow max-w-md w-full text-center">
            <div className="w-20 h-20 bg-yellow-500 flex items-center justify-center mx-auto mb-6">
              <MapPin className="w-12 h-12 text-white" />
            </div>
            <h2 className="mb-2">Bem-vindo de volta!</h2>
            <p className="text-gray-500 mb-4">
              {sessionData.user?.name ? `OlÇ­, ${sessionData.user.name}!` : ""}
            </p>
            <p className="text-sm text-red-600 mb-4">{locationError}</p>
            <div className="space-y-3">
              <Button
                onClick={requestLocation}
                variant="outline"
                className="w-full border-2 border-black"
              >
                <MapPin className="w-4 h-4 mr-2" />
                Tentar novamente
              </Button>
              {sessionData.redirectUrl && (
                <Button onClick={handleRedirect} className="w-full">
                  Continuar sem check-in <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      );
    }

    // Processing check-in
    if (manualCheckinMutation.isPending) {
      return (
        <div className="min-h-screen bg-white flex items-center justify-center p-4">
          <div className="text-center">
            <div className="w-20 h-20 bg-green-600 flex items-center justify-center mx-auto mb-6">
              <Loader2 className="w-12 h-12 text-white animate-spin" />
            </div>
            <h2 className="mb-2">Registrando presenÇõa...</h2>
            <p className="text-gray-500">
              {sessionData.user?.name ? `${sessionData.user.name}` : "Aguarde"}
            </p>
          </div>
        </div>
      );
    }

    // Check-in completed - show success and redirect
    if (checkinDone) {
      return (
        <div className="min-h-screen bg-white flex items-center justify-center p-4">
          <div className="border-4 border-green-600 p-8 md:p-12 brutal-shadow max-w-md w-full text-center bg-green-50">
            <div className="w-20 h-20 bg-green-600 flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-12 h-12 text-white" />
            </div>
            <h2 className="mb-2 text-green-800">Check-in Realizado!</h2>
            <p className="text-gray-600 mb-4">
              {sessionData.user?.name
                ? `${sessionData.user.name}, sua presenÇõa foi registrada.`
                : "Sua presenÇõa foi registrada."}
            </p>
            {sessionData.redirectUrl && (
              <>
                <p className="text-sm text-gray-500 mb-4">Redirecionando...</p>
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-green-600" />
              </>
            )}
            {!sessionData.redirectUrl && (
              <p className="text-sm text-gray-500">VocÇ¦ pode fechar esta pÇ­gina.</p>
            )}
          </div>
        </div>
      );
    }

    // No active schedule - redirecting directly
    if (isRedirecting || autoCheckinStatus === "no-schedule") {
      return (
        <div className="min-h-screen bg-white flex items-center justify-center p-4">
          <div className="text-center">
            <div className="w-20 h-20 bg-green-600 flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-12 h-12 text-white" />
            </div>
            <h2 className="mb-2">Bem-vindo de volta!</h2>
            <p className="text-gray-500 mb-4">
              {sessionData.user?.name
                ? `OlÇ­, ${sessionData.user.name}!`
                : "ConexÇœo registrada."}
            </p>
            {sessionData.redirectUrl ? (
              <>
                <p className="text-sm text-gray-400 mb-4">Redirecionando...</p>
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" />
              </>
            ) : (
              <p className="text-sm text-gray-500">VocÇ¦ pode fechar esta pÇ­gina.</p>
            )}
          </div>
        </div>
      );
    }

    // Waiting for schedule data or location
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-20 h-20 bg-black flex items-center justify-center mx-auto mb-6">
            <Loader2 className="w-12 h-12 text-white animate-spin" />
          </div>
          <h2 className="mb-2">Processando...</h2>
          <p className="text-gray-500">Aguarde um momento</p>
        </div>
      </div>
    );
  }

  if (isGuestRedirecting) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-20 h-20 bg-green-600 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-12 h-12 text-white" />
          </div>
          <h2 className="mb-2">Convidado</h2>
          {guestRedirectUrl ? (
            <>
              <p className="text-sm text-gray-400 mb-4">Redirecionando...</p>
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" />
            </>
          ) : (
            <p className="text-sm text-gray-500">VocÇ¦ pode fechar esta pÇ­gina.</p>
          )}
        </div>
      </div>
    );
  }

  // New device - lookup member
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b-4 border-black">
        <div className="container py-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-black flex items-center justify-center">
            <Nfc className="w-6 h-6 text-white" />
          </div>
          <span className="text-lg font-black uppercase tracking-tight">NFC//SYS</span>
        </div>
      </header>

      <main className="container py-12 md:py-20">
        <div className="max-w-lg mx-auto">
          <div className="border-4 border-black brutal-shadow">
            <div className="bg-black text-white p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 bg-white flex items-center justify-center">
                  <Nfc className="w-9 h-9 text-black" />
                </div>
                <div>
                  <h3 className="text-white text-xl">Primeira ConexÇœo</h3>
                  <p className="text-gray-400 text-sm font-mono">Tag: {tagUid}</p>
                </div>
              </div>
            </div>

            <div className="p-6 md:p-8">
              <p className="text-gray-600 mb-6">
                Digite CPF, telefone ou email para localizar seu cadastro e fazer check-in.
              </p>

              <form onSubmit={handleLookupSubmit} className="space-y-4">
                <div>
                  <Label className="font-bold uppercase text-sm">CPF, Telefone ou Email</Label>
                  <Input
                    value={lookupValue}
                    onChange={(e) => {
                      setLookupValue(e.target.value);
                      if (lookupAttempted) {
                        setLookupAttempted(false);
                        setLookupResult(null);
                      }
                    }}
                    placeholder="Digite CPF, telefone ou email"
                    className="border-2 border-black rounded-none mt-1"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={lookupMemberMutation.isPending}
                  className="w-full brutal-shadow-sm hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all font-bold uppercase text-lg py-6 h-auto mt-6"
                >
                  {lookupMemberMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 w-5 h-5 animate-spin" /> Buscando...
                    </>
                  ) : (
                    <>
                      Buscar <ArrowRight className="ml-2 w-5 h-5" />
                    </>
                  )}
                </Button>
              </form>

              {lookupAttempted && lookupResult && !lookupResult.exists && (
                <div className="mt-6 border-2 border-black p-4 bg-gray-50">
                  <h4 className="font-bold uppercase text-sm mb-2">Cadastro nÇœo encontrado</h4>
                  <p className="text-sm text-gray-600 mb-4">
                    VocÇ¦ pode continuar como convidado ou fazer o cadastro agora.
                  </p>
                  <div className="space-y-3">
                    <Button
                      onClick={handleGuestContinue}
                      disabled={guestRegisterMutation.isPending}
                      className="w-full font-bold uppercase"
                    >
                      {guestRegisterMutation.isPending ? "Processando..." : "Continuar como convidado"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleMemberRegister}
                      className="w-full border-2 border-black hover:bg-gray-100 font-bold uppercase"
                    >
                      Cadastrar
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

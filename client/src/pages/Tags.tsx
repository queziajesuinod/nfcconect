import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { trpc } from "@/lib/trpc";
import { Plus, Pencil, Trash2, Nfc, ExternalLink, Copy, QrCode, MapPin, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import RedirectPlaceholders from "@/components/RedirectPlaceholders";
import { toast } from "sonner";

type TagStatus = "active" | "inactive" | "blocked";

interface TagFormData {
  uid: string;
  name: string;
  description: string;
  status: TagStatus;
  redirectUrl: string;
  latitude: string;
  longitude: string;
  radiusMeters: number;
  enableCheckin: boolean;
}

const BASE_FORM_VALUES = {
  name: "",
  description: "",
  status: "active" as TagStatus,
  redirectUrl: "",
  latitude: "",
  longitude: "",
  radiusMeters: 100,
  enableCheckin: false,
};

const buildDatePrefix = () => {
  const now = new Date();
  const pad = (value: number) => value.toString().padStart(2, "0");
  const year = now.getFullYear();
  const month = pad(now.getMonth() + 1);
  const day = pad(now.getDate());
  const hours = pad(now.getHours());
  const minutes = pad(now.getMinutes());
  const seconds = pad(now.getSeconds());
  return `${year}${month}${day}${hours}${minutes}${seconds}`;
};

const buildDefaultUid = () => `TAGIECG${buildDatePrefix()}`;
const createDefaultFormData = (): TagFormData => ({
  uid: buildDefaultUid(),
  ...BASE_FORM_VALUES,
});

export default function Tags() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isQrOpen, setIsQrOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [formData, setFormData] = useState<TagFormData>(createDefaultFormData());
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [editId, setEditId] = useState<number | null>(null);
  const [selectedTagUrl, setSelectedTagUrl] = useState<string>("");
  const [selectedTagName, setSelectedTagName] = useState<string>("");
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  const utils = trpc.useUtils();
  const { data: tagsData, isLoading } = trpc.tags.list.useQuery({ page, pageSize });
  const totalTags = tagsData?.total ?? 0;
  const totalPages = Math.max(Math.ceil(totalTags / pageSize) || 1, 1);
  const tags = tagsData?.items ?? [];
  useEffect(() => {
    if (page > totalPages && totalPages > 0) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const createMutation = trpc.tags.create.useMutation({
    onSuccess: () => {
      setPage(1);
      utils.tags.list.invalidate({ page: 1, pageSize });
      utils.stats.overview.invalidate();
      setIsCreateOpen(false);
      setFormData(createDefaultFormData());
      toast.success("Tag criada com sucesso!");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const updateMutation = trpc.tags.update.useMutation({
    onSuccess: () => {
      utils.tags.list.invalidate({ page, pageSize });
      setIsEditOpen(false);
      setFormData(createDefaultFormData());
      setEditId(null);
      toast.success("Tag atualizada com sucesso!");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const deleteMutation = trpc.tags.delete.useMutation({
    onSuccess: () => {
      utils.stats.overview.invalidate();
      utils.tags.list.invalidate({ page, pageSize });
      setDeleteId(null);
      toast.success("Tag excluída com sucesso!");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleCreate = () => {
    if (!formData.uid.trim()) {
      toast.error("UID é obrigatório");
      return;
    }
    createMutation.mutate({
      uid: formData.uid,
      name: formData.name || undefined,
      description: formData.description || undefined,
      status: formData.status,
      redirectUrl: formData.redirectUrl || undefined,
      latitude: formData.latitude || undefined,
      longitude: formData.longitude || undefined,
      radiusMeters: formData.radiusMeters || undefined,
      enableCheckin: formData.enableCheckin,
    });
  };

  const handleEdit = (tag: NonNullable<typeof tags>[0]) => {
    setFormData({
      uid: tag.uid,
      name: tag.name || "",
      description: tag.description || "",
      status: tag.status,
      redirectUrl: tag.redirectUrl || "",
      latitude: tag.latitude || "",
      longitude: tag.longitude || "",
      radiusMeters: tag.radiusMeters || 100,
      enableCheckin: tag.enableCheckin || false,
    });
    setEditId(tag.id);
    setIsEditOpen(true);
  };

  const getNextCloneIndex = (values: string[], prefix: string) => {
    let maxIndex = 0;
    values.forEach((value) => {
      if (!value?.startsWith(prefix)) return;
      const remainder = value.slice(prefix.length);
      const match = remainder.match(/^(\d+)/);
      if (match) {
        const parsed = parseInt(match[1], 10);
        if (!Number.isNaN(parsed)) {
          maxIndex = Math.max(maxIndex, parsed);
        }
      }
    });
    return maxIndex + 1;
  };

  const handleClone = (tag: NonNullable<typeof tags>[0]) => {
    const baseName = tag.name || tag.uid;
    const namePrefix = `${baseName} (copy `;
    const nextNameIndex = getNextCloneIndex(tags.map((t) => t.name || ""), namePrefix);
    const cloneName = `${baseName} (copy ${nextNameIndex})`;
    const cloneUid = buildDefaultUid();

    createMutation.mutate({
      uid: cloneUid,
      name: cloneName,
      description: tag.description || undefined,
      status: tag.status,
      redirectUrl: tag.redirectUrl || undefined,
      latitude: tag.latitude || undefined,
      longitude: tag.longitude || undefined,
      radiusMeters: tag.radiusMeters || undefined,
      enableCheckin: tag.enableCheckin,
    });
  };

  const handleUpdate = () => {
    if (!editId) return;
    updateMutation.mutate({
      id: editId,
      name: formData.name || undefined,
      description: formData.description || undefined,
      status: formData.status,
      redirectUrl: formData.redirectUrl || undefined,
      latitude: formData.latitude || undefined,
      longitude: formData.longitude || undefined,
      radiusMeters: formData.radiusMeters || undefined,
      enableCheckin: formData.enableCheckin,
    });
  };

  // Get current location
  const fetchIpLocation = async (reason?: string) => {
    console.log("[Tags] fetchIpLocation reason:", reason);
    try {
      const response = await fetch("https://ipapi.co/json/");
      if (!response.ok) {
        throw new Error("IP geolocation request failed");
      }
      const data = await response.json();
      if (!data.latitude || !data.longitude) {
        throw new Error("Não foi possível obter coordenadas via IP");
      }
      console.log("[Tags] IP location result:", data);
      setFormData((prev) => ({
        ...prev,
        latitude: data.latitude.toString(),
        longitude: data.longitude.toString(),
      }));
      if (reason) {
        toast.info("Localização aproximada obtida via IP");
      } else {
        toast.success("Localização obtida via IP");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro desconhecido ao consultar IP";
      toast.error("Erro ao obter localização: " + message);
    } finally {
      setIsGettingLocation(false);
    }
  };

    const getCurrentLocation = () => {
    console.log("[Tags] requesting browser geolocation");
    if (!navigator.geolocation) {
      toast.error("Geolocalização não suportada pelo navegador");
      fetchIpLocation("geolocation not supported");
      return;
    }

    setIsGettingLocation(true);
    
    // Try with standard accuracy first (faster, works better indoors)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        console.log("[Tags] browser location success:", position.coords);
        setFormData((prev) => ({
          ...prev,
          latitude: position.coords.latitude.toString(),
          longitude: position.coords.longitude.toString(),
        }));
        setIsGettingLocation(false);
        toast.success("Localização capturada com sucesso!");
      },
      (error) => {
        console.log("[Tags] browser location error:", error);
        
        // Provide user-friendly error messages
        let errorMessage = "Erro ao obter localização";
        if (error.code === error.PERMISSION_DENIED) {
          errorMessage = "Permissão de localização negada. Usando localização aproximada por IP.";
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          errorMessage = "Localização indisponível. Usando localização aproximada por IP.";
        } else if (error.code === error.TIMEOUT) {
          errorMessage = "Tempo esgotado ao obter localização. Usando localização aproximada por IP.";
        }
        
        toast.warning(errorMessage);
        
        // Fallback to IP-based geolocation
        fetchIpLocation(error.message);
      },
      { 
        enableHighAccuracy: false,  // Use network/WiFi location (faster)
        timeout: 30000,              // 30 seconds timeout
        maximumAge: 300000           // Accept cached location up to 5 minutes old
      }
    );
  };

  // Gera a URL para gravação NFC
  const getNfcWriteUrl = (uid: string) => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/nfc?uid=${encodeURIComponent(uid)}`;
  };

  // Copia URL para área de transferência
  const copyNfcUrl = (uid: string) => {
    const url = getNfcWriteUrl(uid);
    navigator.clipboard.writeText(url);
    toast.success("URL copiada! Use esta URL para gravar na tag NFC.");
  };

  // Abre modal com QR Code
  const showQrCode = (uid: string, name: string) => {
    setSelectedTagUrl(getNfcWriteUrl(uid));
    setSelectedTagName(name || uid);
    setIsQrOpen(true);
  };

  // Gera URL do QR Code via API externa
  const getQrCodeUrl = (url: string) => {
    return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url)}`;
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: "bg-black text-white",
      inactive: "bg-gray-200 text-gray-700",
      blocked: "bg-red-600 text-white",
    };
    const labels: Record<string, string> = {
      active: "ATIVO",
      inactive: "INATIVO",
      blocked: "BLOQUEADO",
    };
    return (
      <span className={`px-3 py-1 text-xs font-bold uppercase ${styles[status] || styles.inactive}`}>
        {labels[status] || status}
      </span>
    );
  };

  // Location form fields component
  const LocationFields = () => (
    <div className="border-2 border-gray-300 p-4 mt-4 bg-gray-50">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5" />
          <Label className="font-bold uppercase text-sm">Geolocalização e Check-in</Label>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-sm">Habilitar Check-in</Label>
          <Switch
            checked={formData.enableCheckin}
            onCheckedChange={(checked) => setFormData({ ...formData, enableCheckin: checked })}
          />
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <Label className="text-xs text-gray-600">Latitude</Label>
          <Input
            value={formData.latitude}
            onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
            placeholder="-23.5505"
            className="border-2 border-black rounded-none mt-1"
          />
        </div>
        <div>
          <Label className="text-xs text-gray-600">Longitude</Label>
          <Input
            value={formData.longitude}
            onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
            placeholder="-46.6333"
            className="border-2 border-black rounded-none mt-1"
          />
        </div>
      </div>
      
      <div className="flex items-center gap-4 mb-4">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={getCurrentLocation}
          disabled={isGettingLocation}
          className="border-2 border-black rounded-none font-bold uppercase text-xs"
        >
          {isGettingLocation ? (
            <>
              <Loader2 className="w-3 h-3 mr-1 animate-spin" /> Obtendo...
            </>
          ) : (
            <>
              <MapPin className="w-3 h-3 mr-1" /> Usar Minha Localização
            </>
          )}
        </Button>
      </div>
      
      <div>
        <Label className="text-xs text-gray-600">Raio de Proximidade (metros)</Label>
        <Input
          type="number"
          value={formData.radiusMeters}
          onChange={(e) => setFormData({ ...formData, radiusMeters: parseInt(e.target.value) || 100 })}
          placeholder="100"
          min={10}
          max={10000}
          className="border-2 border-black rounded-none mt-1 w-32"
        />
        <p className="text-xs text-gray-500 mt-1">
          Distância máxima para validar check-in (10-10000m)
        </p>
      </div>
    </div>
  );

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="border-b-4 border-black pb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div>
            <div className="flex items-center gap-4 mb-4">
              <span className="text-xs font-bold uppercase tracking-widest bg-black text-white px-3 py-1">
                Gerenciamento
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl">Tags NFC</h1>
          </div>
          
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="brutal-shadow-sm hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all font-bold uppercase">
                <Plus className="w-5 h-5 mr-2" /> Nova Tag
              </Button>
            </DialogTrigger>
            <DialogContent className="border-4 border-black rounded-none brutal-shadow max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black uppercase">Nova Tag NFC</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label className="font-bold uppercase text-sm">UID *</Label>
                  <Input
                    value={formData.uid}
                    onChange={(e) => setFormData({ ...formData, uid: e.target.value })}
                    placeholder="Ex: TAG001 ou 04:A3:B2:C1"
                    className="border-2 border-black rounded-none mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Identificador único da tag. Será usado na URL de gravação.
                  </p>
                </div>
                <div>
                  <Label className="font-bold uppercase text-sm">Nome</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Nome identificador"
                    className="border-2 border-black rounded-none mt-1"
                  />
                </div>
                <div>
                  <Label className="font-bold uppercase text-sm">Descrição</Label>
                  <Input
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Descrição da tag"
                    className="border-2 border-black rounded-none mt-1"
                  />
                </div>
                <div>
                  <Label className="font-bold uppercase text-sm">Status</Label>
                  <Select value={formData.status} onValueChange={(v: TagStatus) => setFormData({ ...formData, status: v })}>
                    <SelectTrigger className="border-2 border-black rounded-none mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="border-2 border-black rounded-none">
                      <SelectItem value="active">Ativo</SelectItem>
                      <SelectItem value="inactive">Inativo</SelectItem>
                      <SelectItem value="blocked">Bloqueado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="font-bold uppercase text-sm">URL de Redirecionamento (opcional)</Label>
                  <Input
                    value={formData.redirectUrl}
                    onChange={(e) => setFormData({ ...formData, redirectUrl: e.target.value })}
                    placeholder="https://exemplo.com"
                    className="border-2 border-black rounded-none mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    URL para onde o usuário será redirecionado após registro.
                  </p>
                  <RedirectPlaceholders />
                </div>
                
                {/* Location Fields */}
                <LocationFields />
                
                {/* Preview da URL */}
                {formData.uid && (
                  <div className="border-2 border-dashed border-gray-400 p-4 bg-gray-50">
                    <Label className="font-bold uppercase text-xs text-gray-600">URL para Gravação NFC</Label>
                    <code className="block text-sm font-mono mt-2 break-all">
                      {getNfcWriteUrl(formData.uid)}
                    </code>
                  </div>
                )}
                
                <Button 
                  onClick={handleCreate} 
                  disabled={createMutation.isPending}
                  className="w-full brutal-shadow-sm hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all font-bold uppercase mt-4"
                >
                  {createMutation.isPending ? "Criando..." : "Criar Tag"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Info Box */}
        <div className="border-4 border-black p-4 bg-gray-50">
          <p className="text-sm">
            <strong>Como usar:</strong> Após criar uma tag, copie a URL gerada e grave-a em sua tag NFC física usando um app como "NFC Tools" no Android. 
            Quando alguém aproximar o celular da tag, será direcionado para a página de registro.
            <br /><br />
            <strong>Check-in:</strong> Habilite o check-in e configure a localização para permitir que usuários façam check-in quando estiverem dentro do raio definido.
          </p>
        </div>

        {/* Tags List */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="border-4 border-black p-6 bg-gray-50 animate-pulse h-32" />
            ))}
          </div>
        ) : tags && tags.length > 0 ? (
          <div className="space-y-0">
            {tags.map((tag, index) => (
              <div
                key={tag.id}
                className={`border-4 border-black p-6 bg-white hover:bg-gray-50 transition-colors ${index > 0 ? '-mt-1' : ''}`}
              >
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="w-12 h-12 bg-black flex items-center justify-center shrink-0">
                      <Nfc className="w-7 h-7 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1 flex-wrap">
                        <h4 className="text-lg font-black">{tag.name || "Sem nome"}</h4>
                        {getStatusBadge(tag.status)}
                        {tag.enableCheckin && (
                          <span className="px-3 py-1 text-xs font-bold uppercase bg-green-600 text-white">
                            CHECK-IN
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-mono text-gray-600 mb-2">UID: {tag.uid}</p>
                      {tag.description && (
                        <p className="text-sm text-gray-500 mb-2">{tag.description}</p>
                      )}
                      
                      {/* Location info */}
                      {tag.latitude && tag.longitude && (
                        <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                          <MapPin className="w-4 h-4" />
                          <span>
                            {parseFloat(tag.latitude).toFixed(4)}, {parseFloat(tag.longitude).toFixed(4)}
                            {tag.radiusMeters && ` (raio: ${tag.radiusMeters}m)`}
                          </span>
                        </div>
                      )}
                      
                      {/* URL para Gravação NFC */}
                      <div className="bg-gray-100 border-2 border-gray-300 p-3 mt-3">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-xs font-bold uppercase text-gray-600">URL para Gravação NFC:</span>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => copyNfcUrl(tag.uid)}
                              className="p-1.5 hover:bg-gray-200 transition-colors"
                              title="Copiar URL"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => showQrCode(tag.uid, tag.name || "")}
                              className="p-1.5 hover:bg-gray-200 transition-colors"
                              title="Ver QR Code"
                            >
                              <QrCode className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        <code className="text-xs font-mono break-all text-gray-700">
                          {getNfcWriteUrl(tag.uid)}
                        </code>
                      </div>
                      
                      {tag.redirectUrl && (
                        <a 
                          href={tag.redirectUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-sm text-black font-medium flex items-center gap-1 mt-2 hover:underline"
                        >
                          <ExternalLink className="w-3 h-3" /> Redireciona para: {tag.redirectUrl}
                        </a>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(tag)}
                      className="border-2 border-black rounded-none font-bold uppercase"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleClone(tag)}
                      disabled={createMutation.isPending}
                      className="border-2 border-black rounded-none font-bold uppercase text-gray-700 hover:bg-gray-200"
                      title="Clonar Tag"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDeleteId(tag.id)}
                      className="border-2 border-black rounded-none font-bold uppercase text-red-600 hover:bg-red-600 hover:text-white"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="border-4 border-black p-12 text-center">
            <div className="w-20 h-20 bg-gray-100 flex items-center justify-center mx-auto mb-6">
              <Nfc className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="mb-2">Nenhuma Tag</h3>
            <p className="text-gray-500 mb-6">Crie sua primeira tag NFC para começar.</p>
            <Button 
              onClick={() => setIsCreateOpen(true)}
              className="brutal-shadow-sm hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all font-bold uppercase"
            >
              <Plus className="w-5 h-5 mr-2" /> Criar Tag
            </Button>
          </div>
        )}

        {!isLoading && tags.length > 0 && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-gray-600">
              Página {page} de {totalPages} · {totalTags} tags
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                disabled={page <= 1}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={page >= totalPages}
              >
                Próxima
              </Button>
            </div>
          </div>
        )}

        {/* Edit Dialog */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="border-4 border-black rounded-none brutal-shadow max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black uppercase">Editar Tag</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label className="font-bold uppercase text-sm">UID</Label>
                <Input
                  value={formData.uid}
                  disabled
                  className="border-2 border-gray-300 rounded-none mt-1 bg-gray-100"
                />
              </div>
              <div>
                <Label className="font-bold uppercase text-sm">Nome</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Nome identificador"
                  className="border-2 border-black rounded-none mt-1"
                />
              </div>
              <div>
                <Label className="font-bold uppercase text-sm">Descrição</Label>
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descrição da tag"
                  className="border-2 border-black rounded-none mt-1"
                />
              </div>
              <div>
                <Label className="font-bold uppercase text-sm">Status</Label>
                <Select value={formData.status} onValueChange={(v: TagStatus) => setFormData({ ...formData, status: v })}>
                  <SelectTrigger className="border-2 border-black rounded-none mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-2 border-black rounded-none">
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="inactive">Inativo</SelectItem>
                    <SelectItem value="blocked">Bloqueado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="font-bold uppercase text-sm">URL de Redirecionamento</Label>
                <Input
                  value={formData.redirectUrl}
                  onChange={(e) => setFormData({ ...formData, redirectUrl: e.target.value })}
                  placeholder="https://exemplo.com"
                  className="border-2 border-black rounded-none mt-1"
                />
                <RedirectPlaceholders />
              </div>
              
              {/* Location Fields */}
              <LocationFields />
              
              <Button 
                onClick={handleUpdate} 
                disabled={updateMutation.isPending}
                className="w-full brutal-shadow-sm hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all font-bold uppercase mt-4"
              >
                {updateMutation.isPending ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* QR Code Dialog */}
        <Dialog open={isQrOpen} onOpenChange={setIsQrOpen}>
          <DialogContent className="border-4 border-black rounded-none brutal-shadow max-w-md">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black uppercase">QR Code</DialogTitle>
            </DialogHeader>
            <div className="text-center py-4">
              <p className="text-sm text-gray-600 mb-4">
                Escaneie este QR Code para testar ou use-o para gravar na tag NFC.
              </p>
              <div className="border-4 border-black p-4 inline-block bg-white">
                <img 
                  src={getQrCodeUrl(selectedTagUrl)} 
                  alt={`QR Code para ${selectedTagName}`}
                  className="w-64 h-64"
                />
              </div>
              <p className="text-xs font-mono mt-4 break-all text-gray-500">
                {selectedTagUrl}
              </p>
              <Button 
                onClick={() => {
                  navigator.clipboard.writeText(selectedTagUrl);
                  toast.success("URL copiada!");
                }}
                className="mt-4 brutal-shadow-sm hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all font-bold uppercase"
              >
                <Copy className="w-4 h-4 mr-2" /> Copiar URL
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent className="border-4 border-black rounded-none brutal-shadow">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-2xl font-black uppercase">Excluir Tag?</AlertDialogTitle>
              <AlertDialogDescription className="text-base">
                Esta ação não pode ser desfeita. A tag será permanentemente removida do sistema.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="border-2 border-black rounded-none font-bold uppercase">
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteId && deleteMutation.mutate({ id: deleteId })}
                className="bg-red-600 hover:bg-red-700 rounded-none font-bold uppercase"
              >
                {deleteMutation.isPending ? "Excluindo..." : "Excluir"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}

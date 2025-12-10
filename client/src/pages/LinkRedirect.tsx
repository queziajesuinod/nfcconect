import { trpc } from "@/lib/trpc";
import { Nfc, Loader2, AlertCircle } from "lucide-react";
import { useEffect } from "react";
import { useParams } from "wouter";

export default function LinkRedirect() {
  const params = useParams<{ shortCode: string }>();
  const shortCode = params.shortCode || "";

  const { data, isLoading, error } = trpc.links.getByShortCode.useQuery(
    { shortCode },
    { enabled: !!shortCode }
  );

  useEffect(() => {
    if (data?.targetUrl) {
      // Small delay for UX
      const timer = setTimeout(() => {
        window.location.href = data.targetUrl;
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [data]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-20 h-20 bg-black flex items-center justify-center mx-auto mb-6">
            <Loader2 className="w-12 h-12 text-white animate-spin" />
          </div>
          <h2 className="mb-2">Redirecionando...</h2>
          <p className="text-gray-500">Aguarde um momento</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="border-4 border-black p-8 md:p-12 brutal-shadow max-w-md w-full text-center">
          <div className="w-20 h-20 bg-red-600 flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-12 h-12 text-white" />
          </div>
          <h2 className="mb-4">Link Inválido</h2>
          <p className="text-gray-600">
            {error.message || "Este link não existe, está desativado ou expirou."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="text-center">
        <div className="w-20 h-20 bg-black flex items-center justify-center mx-auto mb-6">
          <Nfc className="w-12 h-12 text-white" />
        </div>
        <h2 className="mb-2">Redirecionando...</h2>
        <p className="text-gray-500">Você será redirecionado em instantes</p>
      </div>
    </div>
  );
}

# Captura Automática de Localização no Primeiro Acesso

## 📋 Funcionalidade

Quando um usuário acessa o app via navegador pela primeira vez usando o link com `?device=`, o sistema:
1. **Pede permissão de localização automaticamente**
2. **Salva a localização no backend**
3. **Marca como "já capturado" no localStorage**
4. **Não pede novamente nos próximos acessos**

---

## 🔗 Link de Acesso

```
https://conecta.iecg.com.br/app?device=39b62aff-15e4-445f-b884-9090467c9378
```

**Parâmetros**:
- `device`: ID único do dispositivo do usuário

---

## 🎯 Fluxo Completo

### 1️⃣ Primeiro Acesso

**Quando o usuário clica no link**:

1. **Página carrega** (`/app?device=...`)
2. **Sistema detecta** que é o primeiro acesso
   - Verifica se `deviceIdParam` está presente
   - Verifica localStorage: `location_captured_{deviceId}`
3. **Pede permissão** de localização automaticamente
4. **Usuário permite** acesso
5. **Localização capturada**:
   - Latitude, longitude, precisão
   - Timestamp
6. **Salva no backend** via `userLocation.update`
7. **Marca no localStorage**: `location_captured_{deviceId} = timestamp`
8. **Toast de sucesso**: "Localização capturada automaticamente!"

### 2️⃣ Próximos Acessos

**Quando o usuário acessa novamente**:

1. **Página carrega** (`/app?device=...`)
2. **Sistema verifica** localStorage
3. **Encontra** `location_captured_{deviceId}`
4. **Não pede permissão novamente** ✅
5. **Log no console**: "Location already captured, skipping auto-capture"
6. **Usuário pode atualizar manualmente** se quiser

---

## 💻 Implementação Técnica

### Código Adicionado

**Arquivo**: `client/src/pages/UserApp.tsx`

```typescript
// Auto-capture location on first access
useEffect(() => {
  // Only run if deviceIdParam is provided (user accessed via link)
  if (!deviceIdParam) return;

  // Check if we already captured location for this device
  const locationCapturedKey = `location_captured_${deviceId}`;
  const hasLocationCaptured = localStorage.getItem(locationCapturedKey);

  if (hasLocationCaptured) {
    console.log('[UserApp] Location already captured, skipping auto-capture');
    return;
  }

  console.log('[UserApp] First access detected, auto-capturing location...');

  // Auto-capture location on first access
  if (!navigator.geolocation) {
    console.log('[UserApp] Geolocation not supported');
    return;
  }

  // Request location permission and capture
  navigator.geolocation.getCurrentPosition(
    (position) => {
      console.log('[UserApp] Auto-capture success:', position.coords);
      
      // Update local state
      setLocation({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: Math.round(position.coords.accuracy),
        timestamp: new Date(position.timestamp),
        error: null,
      });

      // Save to backend
      updateLocationMutation.mutate({
        deviceId,
        latitude: position.coords.latitude.toString(),
        longitude: position.coords.longitude.toString(),
        accuracy: Math.round(position.coords.accuracy),
        deviceInfo: navigator.userAgent,
      });

      // Mark as captured in localStorage
      localStorage.setItem(locationCapturedKey, new Date().toISOString());
      
      toast.success('Localização capturada automaticamente!');
    },
    (error) => {
      console.log('[UserApp] Auto-capture error:', error);
      
      let errorMsg = 'Erro ao obter localização automaticamente';
      switch (error.code) {
        case error.PERMISSION_DENIED:
          errorMsg = 'Permissão de localização negada. Você pode ativá-la manualmente abaixo.';
          break;
        case error.POSITION_UNAVAILABLE:
          errorMsg = 'Localização indisponível. Tente novamente mais tarde.';
          break;
        case error.TIMEOUT:
          errorMsg = 'Tempo esgotado ao obter localização. Tente novamente.';
          break;
      }
      
      toast.warning(errorMsg);
    },
    {
      enableHighAccuracy: false,  // Use WiFi/network (faster)
      timeout: 30000,              // 30 seconds
      maximumAge: 300000           // Accept 5-minute-old cached location
    }
  );
}, [deviceIdParam, deviceId, updateLocationMutation]);
```

---

## 🔑 Detalhes Técnicos

### LocalStorage Key

```
location_captured_{deviceId}
```

**Exemplo**:
```
location_captured_39b62aff-15e4-445f-b884-9090467c9378
```

**Valor armazenado**:
```
2025-12-17T19:30:45.123Z
```

### Configuração de Geolocalização

| Opção | Valor | Motivo |
|-------|-------|--------|
| `enableHighAccuracy` | `false` | WiFi/rede é mais rápido que GPS |
| `timeout` | `30000` (30s) | Tempo suficiente para obter localização |
| `maximumAge` | `300000` (5min) | Aceita localização em cache |

### Endpoint Backend

**Rota**: `userLocation.update`

**Input**:
```typescript
{
  deviceId: string;
  latitude: string;
  longitude: string;
  accuracy?: number;
  deviceInfo?: string;
}
```

**Ação**:
1. Busca usuário por `deviceId`
2. Salva localização na tabela `user_location_updates`
3. Retorna sucesso

---

## 📊 Casos de Uso

### Caso 1: Primeiro Acesso - Permissão Concedida

**Fluxo**:
1. Usuário clica no link: `/app?device=abc-123`
2. Navegador pede permissão de localização
3. Usuário clica em **"Permitir"**
4. Localização capturada: `-20.4697, -54.6201`
5. Salva no backend
6. Marca no localStorage
7. Toast: "Localização capturada automaticamente!"

**Resultado**:
- ✅ Localização salva no backend
- ✅ Marcado no localStorage
- ✅ Próximos acessos não pedem novamente

### Caso 2: Primeiro Acesso - Permissão Negada

**Fluxo**:
1. Usuário clica no link: `/app?device=abc-123`
2. Navegador pede permissão de localização
3. Usuário clica em **"Bloquear"**
4. Toast: "Permissão negada. Você pode ativá-la manualmente abaixo."

**Resultado**:
- ❌ Localização não capturada
- ❌ Não marca no localStorage
- ℹ️ Próximo acesso tentará novamente
- ℹ️ Usuário pode ativar manualmente na página

### Caso 3: Segundo Acesso

**Fluxo**:
1. Usuário clica no link: `/app?device=abc-123`
2. Sistema verifica localStorage
3. Encontra: `location_captured_abc-123`
4. **Não pede permissão novamente**
5. Log: "Location already captured, skipping auto-capture"

**Resultado**:
- ✅ Não incomoda o usuário
- ✅ Experiência fluida
- ✅ Pode atualizar manualmente se quiser

### Caso 4: Timeout

**Fluxo**:
1. Usuário clica no link: `/app?device=abc-123`
2. Navegador pede permissão
3. Usuário permite
4. GPS demora muito (ambiente interno)
5. Após 30 segundos → Timeout
6. Toast: "Tempo esgotado. Tente novamente."

**Resultado**:
- ❌ Localização não capturada
- ❌ Não marca no localStorage
- ℹ️ Próximo acesso tentará novamente
- ℹ️ Usuário pode tentar manualmente

---

## 🎁 Benefícios

### Experiência do Usuário
- ✅ **Automático**: Não precisa clicar em botão
- ✅ **Uma vez só**: Não pede novamente
- ✅ **Não intrusivo**: Apenas no primeiro acesso
- ✅ **Mensagens claras**: Explica o que aconteceu

### Check-in Automático por Proximidade
- ✅ **Localização inicial salva**: Necessário para check-in por proximidade
- ✅ **Atualização periódica**: Usuário pode ativar sincronização automática
- ✅ **Raio de proximidade**: Sistema pode calcular distância da tag NFC

### Performance
- ⚡ **WiFi/rede**: Mais rápido que GPS
- ⚡ **Cache**: Aceita localização recente
- ⚡ **Timeout maior**: Menos falhas

---

## 🧪 Como Testar

### Teste 1: Primeiro Acesso - Sucesso

1. **Limpar localStorage** (opcional):
   ```javascript
   localStorage.clear();
   ```

2. **Acessar link**:
   ```
   https://conecta.iecg.com.br/app?device=test-device-123
   ```

3. **Permitir** localização quando solicitado

**Resultado esperado**:
- ✅ Toast: "Localização capturada automaticamente!"
- ✅ LocalStorage tem: `location_captured_test-device-123`
- ✅ Backend recebe localização

### Teste 2: Segundo Acesso - Não Pede Novamente

1. **Acessar mesmo link novamente**:
   ```
   https://conecta.iecg.com.br/app?device=test-device-123
   ```

**Resultado esperado**:
- ✅ **Não pede permissão** de localização
- ✅ Console: "Location already captured, skipping auto-capture"
- ✅ Página carrega normalmente

### Teste 3: Permissão Negada

1. **Limpar localStorage**
2. **Acessar link**
3. **Bloquear** localização quando solicitado

**Resultado esperado**:
- ✅ Toast: "Permissão negada. Você pode ativá-la manualmente abaixo."
- ✅ LocalStorage **não** tem a chave
- ✅ Próximo acesso tentará novamente

---

## 🔄 Resetar Captura

Se o usuário quiser que o sistema peça localização novamente:

### Opção 1: Limpar localStorage no Navegador

1. Abrir DevTools (F12)
2. Ir em **Application** → **Local Storage**
3. Deletar chave: `location_captured_{deviceId}`

### Opção 2: Via Console

```javascript
// Deletar para device específico
localStorage.removeItem('location_captured_39b62aff-15e4-445f-b884-9090467c9378');

// Ou deletar todos
localStorage.clear();
```

### Opção 3: Botão na Interface (Futuro)

Pode-se adicionar um botão "Atualizar Localização" que:
1. Remove a chave do localStorage
2. Recarrega a página
3. Sistema pede localização novamente

---

## 📝 Notas Importantes

### 1. Apenas com Parâmetro `device`

A captura automática **só funciona** quando o link tem `?device=`:
- ✅ `/app?device=abc-123` → Captura automática
- ❌ `/app` → Não captura automaticamente

### 2. Permissão do Navegador

O navegador **sempre pede permissão** na primeira vez, não há como evitar por segurança.

### 3. HTTPS Obrigatório

Geolocalização só funciona em:
- ✅ HTTPS (produção)
- ✅ localhost (desenvolvimento)
- ❌ HTTP (não funciona)

### 4. Persistência

A marcação no localStorage persiste até:
- Usuário limpar dados do navegador
- Usuário deletar manualmente
- App ser desinstalado (PWA)

---

## 🎉 Conclusão

A captura automática de localização no primeiro acesso:
1. ✅ **Melhora a experiência** do usuário
2. ✅ **Não incomoda** nos próximos acessos
3. ✅ **Habilita check-in por proximidade**
4. ✅ **É rápida e confiável**

Sistema pronto para uso! 🚀

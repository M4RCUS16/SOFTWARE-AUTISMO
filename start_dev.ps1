 # Inicia backend (Django) e frontend (React) em janelas separadas
# Uso: powershell -ExecutionPolicy Bypass -File start_dev.ps1

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$backend = Join-Path $root 'backend'
$frontend = Join-Path $root 'frontend'

$backendVenv = Join-Path $backend '.venv\Scripts\Activate.ps1'
$rootVenv = Join-Path $root '.venv\Scripts\Activate.ps1'

if (Test-Path $backendVenv) {
    $venvActivate = $backendVenv
} elseif (Test-Path $rootVenv) {
    $venvActivate = $rootVenv
} else {
    Write-Host 'Ambiente virtual nao encontrado. Crie .venv na raiz ou em backend/.venv.' -ForegroundColor Red
    exit 1
}

function Stop-PortProcess {
    param (
        [int]$Port,
        [string]$Label
    )

    try {
        $connections = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction Stop
    } catch {
        return
    }

    $uniquePids = $connections | Select-Object -ExpandProperty OwningProcess -Unique
    foreach ($processId in $uniquePids) {
        try {
            $proc = Get-Process -Id $processId -ErrorAction Stop
            Write-Host "Encerrando processo em uso para a porta $Port ($Label): $($proc.ProcessName) [PID $processId]" -ForegroundColor Yellow
            Stop-Process -Id $processId -Force
        } catch {
            Write-Host "Nao foi possivel encerrar o processo [PID $processId] que usa a porta $Port. Execute manualmente." -ForegroundColor Red
        }
    }
}

function Get-AvailablePort {
    param (
        [int]$Preferred,
        [int]$Fallback = 0
    )

    $candidates = @($Preferred)
    if ($Fallback -gt 0) {
        $candidates += $Fallback
    }

    foreach ($port in $candidates) {
        $listener = $null
        try {
            $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $port)
            $listener.Start()
            return $port
        } catch {
            continue
        } finally {
            if ($listener) {
                $listener.Stop()
            }
        }
    }
    return $null
}

# Garantir que as portas estao livres e obter portas disponiveis
Stop-PortProcess -Port 8000 -Label 'backend'
$backendPort = Get-AvailablePort -Preferred 8000 -Fallback 8001
if (-not $backendPort) {
    Write-Host 'Nenhuma porta disponivel para o backend (8000/8001).' -ForegroundColor Red
    exit 1
}
if ($backendPort -ne 8000) {
    Write-Host "Porta 8000 ocupada. Backend sera iniciado na porta $backendPort." -ForegroundColor Yellow
}

Stop-PortProcess -Port 3000 -Label 'frontend'
$frontendPort = Get-AvailablePort -Preferred 3000 -Fallback 3001
if (-not $frontendPort) {
    Write-Host 'Nenhuma porta disponivel para o frontend (3000/3001).' -ForegroundColor Red
    exit 1
}
if ($frontendPort -ne 3000) {
    Write-Host "Porta 3000 ocupada. Frontend sera iniciado na porta $frontendPort." -ForegroundColor Yellow
}

Write-Host 'Iniciando backend (Django) e frontend (React)...' -ForegroundColor Cyan

# Backend server
Start-Process powershell -WorkingDirectory $backend -ArgumentList @(
    '-NoExit',
    '-Command',
    ". `"$venvActivate`"; python manage.py runserver 0.0.0.0:$backendPort"
)

# Frontend dev server
Start-Process powershell -WorkingDirectory $frontend -ArgumentList @(
    '-NoExit',
    '-Command',
    "Set-Item Env:PORT $frontendPort; Set-Item Env:API_PROXY http://localhost:$backendPort; Set-Item Env:API_BASE_URL http://localhost:$backendPort/api; npm start"
)

Write-Host "Dois terminais foram abertos com os servidores em execucao." -ForegroundColor Green
Write-Host "Backend: http://127.0.0.1:$backendPort/  |  Frontend: http://localhost:$frontendPort/" -ForegroundColor Green

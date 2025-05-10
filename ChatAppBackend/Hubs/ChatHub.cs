using Microsoft.AspNetCore.SignalR;
using System.Threading.Tasks;
using System.Collections.Generic;
using System;

namespace ChatAppBackend.Hubs
{
    public class ChatHub : Hub
    {
        public async Task SendMessage(string user, string message, string role)
        {
            await Clients.All.SendAsync("ReceiveMessage", user, message, role);
            await Clients.All.SendAsync("TypingEnded", user);
        }

        public async Task SendAnnouncement(string user, string message, string role)
        {
            if (role == "Teacher")
            {
                await Clients.All.SendAsync("ReceiveAnnouncement", user, message, role);
            }
        }

        public async Task DeleteMessage(int index)
        {
            await Clients.All.SendAsync("MessageDeleted", index);
        }

        public async Task EditMessage(int index, string newContent)
        {
            await Clients.All.SendAsync("MessageEdited", index, newContent);
        }

        public async Task PinMessage(int index)
        {
            await Clients.All.SendAsync("MessagePinned", index);
        }

        public async Task Typing(string user)
        {
            await Clients.Others.SendAsync("TypingStarted", user);
        }

        public async Task StopTyping(string user)
        {
            await Clients.Others.SendAsync("TypingEnded", user);
        }

        public override Task OnConnectedAsync()
        {
            Console.WriteLine($"Användare ansluten: {Context.ConnectionId}");
            return base.OnConnectedAsync();
        }

        public override Task OnDisconnectedAsync(Exception exception)
        {
            if (exception != null)
            {
                Console.WriteLine($"Ett error uppstod när du försökte frånkoppla: {exception.Message}");
            }
            else
            {
                Console.WriteLine($"Användare frånkopplad: {Context.ConnectionId}");
            }

            return base.OnDisconnectedAsync(exception);
        }
    }
}


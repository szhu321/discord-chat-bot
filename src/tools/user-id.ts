import { Guild } from "discord.js";


export interface UserData {
    name: string;
    // nickname: string;
    // displayname: string;
    id: string;
}

export async function getAllMemberInfo(guild: Guild) {
    const members = await guild.members.fetch();
    const resultMembers: UserData[] = [];
    members.forEach((member) => {
        resultMembers.push({
            name: member.user.displayName,
            id: member.user.id,
        })
    });
    return resultMembers;
} 
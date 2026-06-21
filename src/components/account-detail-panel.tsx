import { Copy, ExternalLink, Eye, EyeOff, Heart, KeyRound, ShieldCheck, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { FavoriteItem } from "@/app/types";

type AccountDetailPanelProps = {
  item: FavoriteItem;
  passwordVisible: boolean;
  revealedSecret: { password?: string } | null;
  accountSecretError?: string;
  onFavorite: () => void;
  onDelete: () => void;
  onOpen: (url: string, copyBeforeOpen?: string) => void;
  onCopyUsername: () => void;
  onTogglePassword: () => void;
  onCopyPassword: () => void;
  onOpenVault: () => void;
};

export function AccountDetailPanel(props: AccountDetailPanelProps) {
  const { item } = props;

  return (
    <aside className="min-h-0 bg-background">
      <ScrollArea className="h-full">
        <Card className="m-4 p-4">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold">
            <KeyRound /> {item.title}
            <Button variant="ghost" size="icon" className="ml-auto" onClick={props.onFavorite}>
              <Heart fill={item.favorite ? "currentColor" : "none"} />
            </Button>
            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" title="删除" onClick={props.onDelete}>
              <Trash2 />
            </Button>
          </div>
          <div className="grid gap-3">
            <div className="grid gap-2">
              <Label>网址</Label>
              <div className="grid grid-cols-[minmax(0,1fr)_36px] gap-2">
                <Input value={item.source_url || ""} readOnly />
                <Button
                  variant="outline"
                  size="icon"
                  disabled={!item.source_url}
                  title="打开链接并复制用户名"
                  onClick={() => item.source_url && props.onOpen(item.source_url, item.content)}
                >
                  <ExternalLink />
                </Button>
              </div>
            </div>
            <div className="grid gap-2">
              <Label>用户名</Label>
              <div className="grid grid-cols-[minmax(0,1fr)_36px] gap-2">
                <Input value={item.content} readOnly />
                <Button variant="outline" size="icon" disabled={!item.content} title="复制用户名" onClick={props.onCopyUsername}>
                  <Copy />
                </Button>
              </div>
            </div>
            {item.encrypted_secret ? (
              <div className="grid gap-2">
                <Label>密码</Label>
                <div className="grid grid-cols-[minmax(0,1fr)_36px_36px] gap-2">
                  <Input type={props.passwordVisible ? "text" : "password"} value={props.revealedSecret?.password || "••••••••"} readOnly />
                  <Button variant="ghost" size="icon" title={props.passwordVisible ? "隐藏密码" : "显示密码"} onClick={props.onTogglePassword}>
                    {props.passwordVisible ? <EyeOff /> : <Eye />}
                  </Button>
                  <Button variant="outline" size="icon" title="复制密码" onClick={props.onCopyPassword}>
                    <Copy />
                  </Button>
                </div>
                {!props.revealedSecret?.password ? (
                  <p className="text-xs text-muted-foreground">保险箱未解锁或主密码已过期，请先在右上角保险箱中解锁后再查看或复制密码。</p>
                ) : null}
                {props.accountSecretError ? (
                  <Card className="grid gap-2 border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-800 shadow-none dark:text-amber-200">
                    <p>{props.accountSecretError}</p>
                    <Button type="button" variant="outline" size="sm" className="justify-self-start" onClick={props.onOpenVault}>
                      <ShieldCheck className="size-3.5" /> 重新解锁保险箱
                    </Button>
                  </Card>
                ) : null}
              </div>
            ) : null}
          </div>
        </Card>
      </ScrollArea>
    </aside>
  );
}

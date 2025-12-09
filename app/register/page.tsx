'use client';

import { useSearchParams } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import Link from 'next/link';
import { Suspense } from 'react';

function RegisterForm() {
    const searchParams = useSearchParams();
    const plan = searchParams.get('plan');

    const planName = plan === 'family' ? 'Family Plan' : 'Individual Plan';
    const price = plan === 'family' ? '$279/mo' : '$129/mo';

    return (
        <div className="container mx-auto px-4 py-20 flex justify-center items-center min-h-[calc(100vh-80px)]">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle>Create your account</CardTitle>
                    <CardDescription>
                        You selected the <span className="font-semibold text-primary">{planName}</span> ({price}).
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="first-name">First name</Label>
                                <Input id="first-name" placeholder="John" required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="last-name">Last name</Label>
                                <Input id="last-name" placeholder="Doe" required />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input id="email" type="email" placeholder="john@example.com" required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <Input id="password" type="password" required />
                        </div>
                        <Button type="submit" className="w-full">
                            Continue to Payment
                        </Button>
                    </form>
                </CardContent>
                <CardFooter className="flex justify-center">
                    <p className="text-sm text-muted-foreground">
                        Already have an account? <Link href="/login" className="text-primary hover:underline">Sign in</Link>
                    </p>
                </CardFooter>
            </Card>
        </div>
    );
}

export default function RegisterPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <RegisterForm />
        </Suspense>
    );
}
